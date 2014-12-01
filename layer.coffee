#弹出层插件
#TODO  esc事件需要处理 后期需要建立一个esc队列 Array队列  后进后出
# TODO  autoArea  后期
# TODO 需要增加 $('div').layer的调用
define (require)->
  btns = [['ok','s-save','确定'],['no','s-cancel','取消'],['other','s-tip','其它']]
  opes = [['max','ope-max','最大化'],['min','ope-min','最小化'],['close','ope-close','关闭']]
  config =
    view: #视图模块
      zIndex: 870617
      top: '50%'
      left: '50%'
    mask: true  #遮罩层
    title: '标题'
    cont: ''
    toolbar: true
    menubar: false
    statusbar: false
    area: true
    operates: [['close','','']] #operates 与btns如果需要额外的信息 比如msg style 等  那么按钮只能在msg中出现  如果不需要，则可以直接把按钮放此对象下
    btns: false  #  格式为  ['ok','no','sssss']
    esc: true
    autoClose: 0
    drag:  #拖拽
      enable: true #允许拖动
      cursor: 'move'
      #axis : null #拖动方向  横向X  纵向Y
      containment : '.g-doc' #设置拖拽范围的元素
      delay: 50
      distance: 10
      opacity: 0.8
      handle:   '.layer-toolbar' #触发拖拽的元素
    ajax:
      enable: false #允许异步加载
      showProgressIcon: true
      initWidth: '80%'  #当为动态加载时，未加载完时的宽度
      initHeight: '80%'
      type: 'get'
      data: null
      refreshHeight: false  #刷新高度
      #carrier: 'iframe'  载入方式
    callbacks: #回调
      ok: (e,ele,_layer,layer,eData)->
        layer.destroy()
      no: (e,ele,_layer,layer,eData)->
        layer.destroy()
      close: (e,ele,_layer,layer,eData)->
        layer.destroy()
  zIndex =  -2
  subElements = ['toolbar','menubar','area','btns','operates','statusbar','mask','cont','title']
  urlSimpleReg = /([^?#]*)(\?[^#]*)?(#.*)?/
  protocolReg = /^(http:|https:)?\/\/.+/  #简单的判断protocol
  _escs = []
  escQue = []
  Layer = (conf)->
    self = @
    self._escs = _escs
    self.escQue = escQue
    _idx = $.isNumeric(conf) and conf or $.isPlainObject(conf) and conf.idx
    if _idx and layer = self.getLayer(conf.idx)#如果已经实例化Layer，则直接显示
      $.isFunction(layer.settings.callbacks.beforeShow) and layer.settings.callbacks.beforeShow(layer)
      layer.show()
      layer
    else
      _conf = $.extend true,{},config,conf
      zIndex += 2
      _conf.view.zIndex += zIndex
      self.settings = _conf
      self.idx = zIndex / 2 + 1
      self.status = 'active'
      SX.layers[self.idx] = self
      init(self)

      self

  _createIframe = ->
    $('<iframe>',
      src: 'javascript:;'
      scrolling: 'no'
      frameborder: 'no'
      allowTransparency: 'true'
      css: {
        border: 'none'
        width: '100%'
        display: 'block'
        height: '100%'
        overflow: 'hidden'
      }
      class: 'layer-iframe'
    )

  _camelCase = (str)->
    str.substring(0,1).toUpperCase() + str.substring(1)

  _fixUrl = (url)->
    s = url.match(urlSimpleReg)
    s.shift()
    s[1] = ( if (s[1] and s[1] isnt '?') then (s[1] + '&') else '?') + 't=' + new Date().getTime() #处理search参数
    s[0] = if protocolReg.test(s[0]) then s[0] else 'http://' + s[0]
    s.join('')

  _asyncCont = (url,ele,layer)->
    if layer.settings.ajax.showProgressIcon
      loading = $(layer.settings.ajax.showProgressIcon)
      unless loading.length
        loading = $('<div class="' + layer.settings.showProgressIcon.substring(1) + '"></div>').appendTo(ele)
      loading.show()
    if layer.settings.ajax.carrier is 'iframe'
      iframe = _createIframe().attr
        src: _fixUrl(url)
        name: 'layer-iframe-' + layer.idx + '-' + new Date().getTime()
      .addClass('layer-iframe-' + layer.idx).one 'load',->
        if layer.status is 'hidden'
          return
        else
          h = layer.asyncIframeHeight(iframe)
          h and _adjustView(ele.parents('.m-layer'),{height: h,_cont:true},layer,false)
        try
          loading.remove()
        $.isFunction(layer.settings.callbacks.afterLoadSucc) and layer.settings.callbacks.afterLoadSucc(iframe,layer)
      ele.html(iframe)
    else
      layer.ajax = $.ajax
        url: url
        type: layer.settings.ajax.type
        data: layer.settings.ajax.data
      .done (json,status,xhr)->
        if layer.status is 'hidden'
          return
        if layer.settings.ajax.refreshHeight
          _overflow = ele.css('overflow')
          ele.css({'overflow':'hidden'}).html(json)  #先隐藏获取高度  然后再正常显示
          h = ele.outerHeight(true)
          h and _adjustView(ele.parents('.m-layer'),{height: h,_cont:true},layer,false)
          ele.css('overflow',_overflow)
        else
          ele.html(json)
        $.isFunction(layer.settings.callbacks.afterLoadSucc) and layer.settings.callbacks.afterLoadSucc(ele,layer)
      .error (xhr,status,error)->
        if error is 'abort'
          return
        $.isFunction(layer.settings.callbacks.loadFail) and layer.settings.callbacks.loadFail(ele,xhr,status,error)
      .always (data,status,xhr)->
        layer.ajax = null
        try
          loading.remove()
        $.isFunction(layer.settings.callbacks.loadAlways) and layer.settings.callbacks.loadAlways(ele,data,status,xhr)
    _autoClose(ele,layer)

  _createOperate = (conf,isBtn)->
    $.isArray(conf) and '<a href="' + (if conf[3] then conf[3] else 'javascript:;') + '" ' + (conf[4] || '') + ' class="' + ((if isBtn then 'u-btn ' else '') + conf[1]) + ' J_action-layer btn-layer-' + conf[0] + '" data-action="' + conf[0] + '">' + conf[2] + '</a>' || ''

  _parseBtnsConf = (conf,isBtns)->
    _btns = {}
    if typeof conf is 'number' or conf > 0
      _btns.msg = if isBtns then btns.slice(0,conf) else opes.slice(0,conf)
      if conf > 3
        i = 0
        while i < conf - 3
          if isBtns
            _btns.msg.push(['other' + i,'s-tip other-' + i, '其它' + i])
          else
            _btns.msg.unshift(['other' + i,'ope-' + i, '其它' + i])
          i++
    else if typeof conf is 'string'
      str = conf.split(',')
      len = str.length
      _btns.msg = if isBtns then btns.slice(0,len) else opes.slice(0,len)
      i = 0
      while i < len
        if i > 2 then _btns.msg.push(['other' + (i - 2),(if isBtns then 's-tip other-' + (i - 2) else 'ope-' + (i - 2)), '其它' + (i - 2)]) else _btns.msg[i][2] = str[i]
        i++
    _btns

  _parseBtns = (conf,isBtns)->
    _isSuit =  $.isPlainObject(conf) and conf.msg || conf
    if typeof _isSuit is 'number' or typeof _isSuit is 'string' and !isClassOrId(_isSuit)
      if $.isPlainObject(conf)
        $.extend true,conf,_parseBtnsConf(_isSuit,isBtns)
      else
        conf = _parseBtnsConf(_isSuit,isBtns)
    else if $.isArray(conf)
      return {msg: conf}
    conf




  _createEle = (type,conf,ele,layer)->  #根据配置生成对应的元素
    if type is 'btns' or type is 'operates'
      isBtn = type is 'btns'
      conf = _parseBtns(conf,isBtn)
    if typeof conf is 'string'
      if _class = isClassOrId(conf)
        ele.addClass(_class)
      else if type is 'cont' and layer.settings.ajax and layer.settings.ajax.enable
       _asyncCont(conf,ele,layer)
      else
        ele.html(conf)
    else if typeof conf is 'object'
      if conf.jquery
        ele.html conf
      else
        if type is 'cont' and layer.settings.ajax and layer.settings.ajax.enable
          _asyncCont(conf.msg,ele,layer)
        else if type is 'operates' or type is 'btns'
          _html = ''
          if conf.msg
            $.each conf.msg,(i,j)->
              _html += _createOperate(j,isBtn)
          ele.html(_html)
        else
          ele.html conf.msg
        ele.addClass(conf.class)
        conf.css and ele.css conf.css
    if type is 'mask'
      ele.addClass('mask-' + layer.idx).css('zIndex',layer.settings.view.zIndex - 1)
    ele

  _createShelf = (ele,layer)->  #创建弹框基本架子  弹框由toolbar  menubar area statusbar mask组成
    $.each subElements,(i,j)->
      if layer.settings[j]
        _ele = $('<div class="layer-' + j + '"></div>')
        if $.isFunction(layer.settings[j])
          _ele = $(layer.settings[j](j,_ele,ele,layer))
        else  #此处不处理操作按钮与operate按钮
          _ele = _createEle(j,layer.settings[j],_ele,layer)
        if i < 6
          _box = ele
        else if i is 7
          _box = ele.find('.layer-area')
        else if i is 8
          _box = ele.find('.layer-toolbar')
        else
          _box = 'body'
        _ele.appendTo(_box)
      i++

  _getWithoutAreaHeight = (ele)->  #获取内容高度
    ele.find('.layer-toolbar').outerHeight(true) + ele.find('.layer-menubar').outerHeight(true) + ele.find('.layer-statusbar').outerHeight(true) + ele.find('.layer-btns').outerHeight(true)

  _adjustView = (ele,data,layer,first)->  #设置弹框样式 弹框的width  height  top  left  并在需要时设置scroll
    layerView =
      wwidth : $(window).width()
      wheight: $(window).height()
    cont = ele.find('.layer-cont')
    area = ele.find('.layer-area')
    props = ['maxWidth','maxHeight','minWidth','minHeight','width','height','left','top']
    unless data._cont
      $.each props,(i,j)->
        if i < 6 and i > 3
          _j = _camelCase(j)
        if n = data[j] or !first and layer.settings.view[j] or layer.settings.ajax and layer.settings.ajax.enable and layer.settings.ajax['init' + _j]
          if (_n = parseFloat(n) / 100) > 0  and  String(n).indexOf('%') > 0
            if i > 5  #LEFT TOP
              _prop = props[i - 2]
              n = (layerView['w' + _prop] - Math.min(layerView[_prop],layerView['w' + _prop])) * _n
            else
              n = parseFloat(layerView['w' + props[i % 2 + 4]]) * _n
        else if i < 6 and i > 3 and first
          n = layerView['min' + _j] || ele['outer' + _j](true)
        n = Math.ceil(parseFloat(n))
        $.isNumeric(n) and layerView[j] = n
        if i < 6 and i > 3
          layerView['_' + j] = layerView[j]
          layerView[j] = Math.min(layerView[j],layerView['w' + j],layerView['max' + _j] || layerView['w' + j])
        true
      _conf = $.extend true,{},(if first then data else layer._view),layerView
    else
      if data.height > (_h = layer._view.height - layer._view.withoutArea)
        area.css({'overflowY':'scroll',height:_h})
        cont.css 'height',data.height
      return
    ele.css _conf
    first and _conf.withoutArea = _getWithoutAreaHeight(ele)
    ox = 'visible'
    oy = 'visible'
    if layerView['_width'] > _conf.wwidth or layerView['_width'] > _conf.maxWidth or _conf.minWidth > _conf.wwidth or !first and layerView['_width'] < layer._view.width
      ox = 'scroll'
    area.css 'overflowX',ox
    cont.css 'width',layerView['_width'] - cont.outerWidth(true) + cont.width()
    if layerView['_height'] > _conf.wheight or layerView['_height'] > _conf.maxHeight or _conf.minHeight > _conf.wheight or !first and layerView['_height'] < layer._view.height
      oy = 'scroll'
    area.css
      'overflowY': oy
      height: _conf.height - _conf.withoutArea
    cont.css 'height',layerView['_height'] - _conf.withoutArea
    layer._view = _conf

  _autoClose = (ele,layer)->  #ele可能是layer 也可能是layer-cont
    if layer.settings.autoClose and layer.status isnt 'hidden'
      clearTimeout(layer._autoCloseTime)
      layer._autoCloseTime = null
      layer._autoCloseTime = setTimeout ->
        unless $.isFunction(layer.settings.callbacks.beforeAutoClose) and layer.settings.callbacks.beforeAutoClose(ele,layer) is false
          layer.hide()  #TODO  先隐藏便于调用回调函数
          $.isFunction(layer.settings.callbacks.afterAutoClose) and layer.settings.callbacks.afterAutoClose(ele,layer)
          if (close = ele.find('.btn-layer-close')).length
            close.trigger('click.layer')
          else if $.isFunction(layer.settings.callbacks.close)
            layer.settings.callbacks.close(null,ele,ele,layer,null)
          else
            layer.destroy()
      ,layer.settings.autoClose

  _unbindEvent = (ele,layer)->
    ele.off('click.layer')
    if layer.settings.esc and ~(idx = $.inArray(layer.idx,layer._escs))
      ~(_idx = $.inArray(layer.idx,layer.escQue)) and layer.escQue.splice(_idx,1)
      layer._escs.splice(idx,1)
      unless layer._escs.length
        $(document).off('keyup.layer')
    if layer._drag
      ele.draggable('destroy')

  _bindEvent = (ele,layer)->
    ele.on 'click.layer','.J_action-layer',(e,eData)->
      self = $(@)
      action = self.data('action')
      if ~action.indexOf(',',1)
        actionFns = action.split(',')
      else if action
        actionFns = [action]
      if actionFns
        i = 0
        while i < actionFns.length
          if $.isFunction(layer.settings.callbacks[actionFns[i]]) and layer.settings.callbacks[actionFns[i]](e,self,ele,layer,eData) is false
            break
          else
            ++i
            continue
        undefined
    if layer.settings.drag and layer.settings.drag.enable
      require.async 'jqueryui',->
        layer._drag = ele.draggable(layer.settings.drag)
        $.each ['create','','start','stop'], (i,j)->
          _fn = 'drag' + j
          if $.isFunction(layer.settings.callbacks[_fn])
            ele.on _fn + '.layer',(e,ui)->
              layer.settings.callbacks[_fn](e,ui,layer)
    #ESC事件处理逻辑  首先检测idx是否处于escQue,然后检测实例是否未处于hidden状态 再触发关闭事件
    if layer.settings.esc
      unless layer._escs.length  #未绑定过esc事件，
        $(document).on 'keyup.layer',(e,eData)->
          if e.keyCode is 27
            len = layer.escQue.length
            while len-- > 0
              if SX.layers[layer.escQue[len]].status isnt 'hidden'
                if $.isFunction(SX.layers[layer.escQue[len]].settings.callbacks.close)
                  SX.layers[layer.escQue[len]].settings.callbacks.close(e,$('.layer-idx-' + SX.layers[layer.escQue[len]].idx),$('.layer-idx-' + SX.layers[layer.escQue[len]].idx),SX.layers[layer.escQue[len]],eData)
                else
                  SX.layers[layer.escQue[len]].destroy()
            undefined
      layer._escs.push(layer.idx)
      layer.esc()

  isClassOrId = (string)->
    (arr = /^[\.\#](.+)/.exec(string)) and arr[1]


  init = (layer)->
    ele = $('<div lidx="' + layer.idx + '" class="m-layer layer-idx-' + layer.idx + ' ' + (layer.settings.lclass || '') + '" style="z-index:-999;left:-99999px;position:' + (layer.settings.view.position || 'fixed') + '"></div>')
    _createShelf(ele,layer)
    ele.appendTo('body')
    $.isFunction(layer.settings.callbacks.beforeShow) and layer.settings.callbacks.beforeShow(ele,layer)
    _adjustView(ele,layer.settings.view,layer,true)
    _bindEvent(ele,layer)
    if $.isFunction(layer.settings.callbacks.afterOpen) and (!layer.settings.ajax or !layer.settings.ajax.enable)
      layer.settings.callbacks.afterOpen(ele,layer)
    _autoClose(ele,layer)


  Layer::getLayer = (idx)->
    unless idx
      return @
    else
      SX.layers[idx]

  Layer::asyncIframeHeight = (iframe)->
    if !(iframe and iframe.length)
      return 0
    h = 0
    try
      iframeDoc = iframe[0].contentWindow.document
      if iframeDoc.body.scrollHeight and iframeDoc.documentElement.scrollHeight
        h = Math.max iframeDoc.body.scrollHeight,iframeDoc.documentElement.scrollHeight
      else if iframeDoc.documentElement.scrollHeight
        h = iframeDoc.documentElement.scrollHeight
      else if iframeDoc.body.scrollHeight
        h = iframeDoc.body.scrollHeight
    h

  Layer::show = (idx)->
    layer = if idx then SX.layers[idx] else @
    if layer
      layer.status = 'active'
      layer.esc()
      _layer = $('.layer-idx-' + layer.idx).css(layer._view).show()  #回复原来位置
      if layer.settings.mask
        $('.mask-' + layer.idx).show()
      ### TODO  暂时不做处理，只加载一次
      if layer.settings.ajax and layer.settings.ajax.enable
        url = if typeof layer.settings.cont is 'string' then layer.settings.cont else layer.settings.cont.msg
        _asyncCont(url,_layer.find('.layer-cont'),layer)

      ###

  Layer::hide = (idx)->
    layer = if idx then SX.layers[idx] else @
    if layer
      _layer = $('.layer-idx-' + layer.idx).hide()
      layer.status = 'hidden'
      if layer._autoCloseTime  #自动关闭
        clearTimeout(layer._autoCloseTime)
        layer._autoCloseTime = null
      ~(_idx = $.inArray(layer.idx,layer.escQue)) and layer.escQue.splice(_idx,1)
      layer.settings.mask and $('.mask-' + layer.idx).hide()
      if layer.settings.ajax and layer.settings.ajax.enable
        if layer.settings.ajax.carrier is 'iframe' then _layer.find('.layer-iframe').attr('src','javascript:;') else layer.ajax and layer.ajax.abort()

  Layer::destroy = (idx)->
    layer = if idx then SX.layers[idx] else @
    if layer
      layer.hide()
      _layer = $('.layer-idx-' + layer.idx)
      _unbindEvent(_layer,layer)
      _layer.remove()
      layer.settings.mask and $('.mask-' + layer.idx).remove()
      layer.settings = null
      layer._drag = null
      delete SX.layers[layer.idx]
      layer = null

  Layer::esc = (idx)->
    self = @
    unless idx
      idxs = [self.idx]
    else if idx
      idxs = idx.split(',')
    if idxs
      self.escQue.length = 0
      $.each idxs,(i,j)->
        if SX.layers[j] and SX.layers[j].status isnt 'hidden' and ~$.inArray(j,self._escs)
          self.escQue.push(j)

  Layer::autoArea = (data)->  # TODO 此处需要重新考虑动态加载的高度
    if $.isPlainObject(data) and (_layer = $('.layer-idx-' + @.idx)).length
      _adjustView(_layer,data,@,false)

  layer = (conf)->
    new Layer(conf)

  $.each ['alert','confirm','load','iframe'],(i,j)->
    layer[j] = (msg,opt)->
      conf =
        cont: msg
      if i is 0
        conf.btns = 1
      else if i is 1
        conf.btns = 2
      else
        conf.ajax =
          enable : true
        if i is 3
          conf.ajax.carrier = 'iframe'
      if $.isFunction(opt)
        conf.callbacks = {}
        if i < 2
          conf.callbacks.ok = (e,ele,layer,data)->
            opt(e,ele,layer,data)
        else
          conf.callbacks.afterLoadSucc = (ele,layer)->
            opt(ele,layer)
      else if $.isPlainObject(opt)
        $.extend true,conf,opt
      else if typeof opt is 'string'
        conf.title = opt
      new Layer(conf)

  layer.tip = (conf,opt)->
    _conf =
      cont: conf
      title: false
      operates: false
      toolbar: false
      drag: false
      mask: false
    $.extend true,_conf,opt
    new Layer(_conf)
  $.fn.layer = (conf)->
    _layer = new Layer(conf)
    $(@).attr('lidx',_layer.idx)
    _layer

  layer

