define(function(require) {
  var Layer, btns, config, escQue, init, isClassOrId, layer, protocolReg, subElements, urlSimpleReg, zIndex, _adjustView, _asyncCont, _autoClose, _bindEvent, _camelCase, _createEle, _createIframe, _createOperate, _createShelf, _escs, _fixUrl, _getWithoutAreaHeight, _parseBtns, _parseBtnsConf, _unbindEvent;
  btns = [['ok', 's-save', '确定'], ['no', 's-cancel', '取消'], ['other', 's-tip', '其它']];
  config = {
    view: {
      zIndex: 870617,
      top: '50%',
      left: '50%'
    },
    mask: true,
    title: '标题',
    cont: '',
    toolbar: true,
    menubar: false,
    statusbar: false,
    area: true,
    operates: [['close', '', '']],
    btns: false,
    esc: true,
    autoClose: 0,
    drag: {
      enable: true,
      cursor: 'move',
      axis: null,
      containment: '.g-doc',
      delay: 50,
      distance: 10,
      opacity: 0.8,
      handle: '.layer-toolbar'
    },
    ajax: {
      enable: false,
      showProgressIcon: true,
      initWidth: '80%',
      initHeight: '80%',
      type: 'get',
      data: null,
      refreshHeight: false
    },
    callbacks: {
      ok: function(e, ele, layer, eData) {
        return layer.destroy();
      },
      no: function(e, ele, layer, eData) {
        return layer.destroy();
      },
      close: function(e, ele, layer, eData) {
        return layer.destroy();
      }
    }
  };
  zIndex = -2;
  subElements = ['toolbar', 'menubar', 'area', 'statusbar', 'mask', 'cont', 'btns', 'operates', 'title'];
  urlSimpleReg = /([^?#]*)(\?[^#]*)?(#.*)?/;
  protocolReg = /^(http:|https:)?\/\/.+/;
  _escs = [];
  escQue = [];
  Layer = function(conf) {
    var layer, self, _conf, _idx;
    self = this;
    self._escs = _escs;
    self.escQue = escQue;
    _idx = $.isNumeric(conf) && conf || $.isPlainObject(conf) && conf.idx;
    if (_idx && (layer = self.getLayer(conf.idx))) {
      $.isFunction(layer.settings.callbacks.beforeShow) && layer.settings.callbacks.beforeShow(layer);
      layer.show();
      return layer;
    } else {
      _conf = $.extend(true, {}, config, conf);
      zIndex += 2;
      _conf.view.zIndex += zIndex;
      self.settings = _conf;
      self.idx = zIndex / 2 + 1;
      self.status = 'active';
      SX.layers[self.idx] = self;
      init(self);
      return self;
    }
  };
  _createIframe = function() {
    return $('<iframe>', {
      src: 'javascript:;',
      scrolling: 'no',
      frameborder: 'no',
      allowTransparency: 'true',
      css: {
        border: 'none',
        width: '100%',
        display: 'block',
        height: '100%',
        overflow: 'hidden'
      },
      "class": 'layer-iframe'
    });
  };
  _camelCase = function(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
  };
  _fixUrl = function(url) {
    var s;
    s = url.match(urlSimpleReg);
    s.shift();
    s[1] = (s[1] && s[1] !== '?' ? s[1] + '&' : '?') + 't=' + new Date().getTime();
    s[0] = protocolReg.test(s[0]) ? s[0] : 'http://' + s[0];
    return s.join('');
  };
  _asyncCont = function(url, ele, layer) {
    var iframe, loading;
    if (layer.settings.ajax.showProgressIcon) {
      loading = $(layer.settings.ajax.showProgressIcon);
      if (!loading.length) {
        loading = $('<div class="' + layer.settings.showProgressIcon.substring(1) + '"></div>').appendTo(ele);
      }
      loading.show();
    }
    if (layer.settings.ajax.carrier === 'iframe') {
      iframe = _createIframe().attr({
        src: _fixUrl(url),
        name: 'layer-iframe-' + layer.idx + '-' + new Date().getTime()
      }).addClass('layer-iframe-' + layer.idx).one('load', function() {
        var h;
        if (layer.status === 'hidden') {
          return;
        } else {
          h = layer.asyncIframeHeight(iframe);
          h && _adjustView(ele.parents('.m-layer'), {
            height: h,
            _cont: true
          }, layer, false);
        }
        try {
          loading.remove();
        } catch (_error) {}
        return $.isFunction(layer.settings.callbacks.afterLoadSucc) && layer.settings.callbacks.afterLoadSucc(iframe, layer);
      });
      ele.html(iframe);
    } else {
      layer.ajax = $.ajax({
        url: url,
        type: layer.settings.ajax.type,
        data: layer.settings.ajax.data
      }).done(function(json, status, xhr) {
        var h, _overflow;
        if (layer.status === 'hidden') {
          return;
        }
        if (layer.settings.ajax.refreshHeight) {
          _overflow = ele.css('overflow');
          ele.css({
            'overflow': 'hidden'
          }).html(json);
          h = ele.outerHeight(true);
          h && _adjustView(ele.parents('.m-layer'), {
            height: h,
            _cont: true
          }, layer, false);
          ele.css('overflow', _overflow);
        } else {
          ele.html(json);
        }
        return $.isFunction(layer.settings.callbacks.afterLoadSucc) && layer.settings.callbacks.afterLoadSucc(ele, layer);
      }).error(function(xhr, status, error) {
        if (error === 'abort') {
          return;
        }
        return $.isFunction(layer.settings.callbacks.loadFail) && layer.settings.callbacks.loadFail(ele, xhr, status, error);
      }).always(function(data, status, xhr) {
        layer.ajax = null;
        try {
          loading.remove();
        } catch (_error) {}
        return $.isFunction(layer.settings.callbacks.loadAlways) && layer.settings.callbacks.loadAlways(ele, data, status, xhr);
      });
    }
    return _autoClose(ele, layer);
  };
  _createOperate = function(conf, isBtn) {
    if ($.isArray(conf)) {
      return '<a href="' + (conf[3] ? conf[3] : 'javascript:;') + '" class="' + ((isBtn ? 'u-btn ' : '') + conf[1]) + ' J_action-layer btn-layer-' + conf[0] + '" data-action="' + conf[0] + '">' + conf[2] + '</a>';
    }
  };
  _parseBtnsConf = function(conf, isBtns) {
    var i, len, _btns, _conf;
    if (typeof conf === 'number' || conf > 0) {
      _conf = btns.slice(0, conf);
      if (conf > 3) {
        i = 0;
        while (i < conf - 3) {
          _conf.push(['other' + i, (isBtns ? 's-tip other-' + i : 'ope-' + i), '其它' + i]);
          i++;
        }
      }
    } else if (typeof conf === 'string') {
      if (isClassOrId(conf)) {
        _conf = conf;
      } else {
        _btns = conf.split(',');
        len = _btns.length;
        _conf = btns.slice(0, len);
        i = 0;
        while (i < len) {
          _conf[i][2] = _btns[i];
          i++;
        }
        _conf;
      }
    } else {
      _conf = conf;
    }
    return _conf;
  };
  _parseBtns = function(conf, isBtns) {
    return _parseBtnsConf(($.isPlainObject(conf) ? (conf.msg ? conf.msg : conf) : conf), isBtns);
  };
  _createEle = function(type, conf, ele, layer) {
    var isBtn, _class, _html;
    if (type === 'btns' || type === 'operates') {
      isBtn = type === 'btns';
      conf = _parseBtns(conf, isBtn);
    }
    if (typeof conf === 'string') {
      if (_class = isClassOrId(conf)) {
        ele.addClass(_class);
      } else if (type === 'cont' && layer.settings.ajax && layer.settings.ajax.enable) {
        _asyncCont(conf, ele, layer);
      } else {
        ele.html(conf);
      }
    } else if (typeof conf === 'object') {
      if (conf.jquery) {
        ele.html(conf);
      } else {
        if (type === 'cont' && layer.settings.ajax && layer.settings.ajax.enable) {
          _asyncCont(conf.msg, ele, layer);
        } else if (type === 'operates' || type === 'btns') {
          _html = '';
          $.each(conf, function(i, j) {
            return _html += _createOperate(j, isBtn);
          });
          ele.html(_html);
        } else {
          ele.html(conf.msg);
        }
        ele.addClass(conf["class"]);
        conf.css && ele.css(conf.css);
      }
    }
    if (type === 'mask') {
      ele.addClass('mask-' + layer.idx).css('zIndex', layer.settings.view.zIndex - 1);
    }
    return ele;
  };
  _createShelf = function(ele, layer) {
    return $.each(subElements, function(i, j) {
      var _box, _ele;
      if (layer.settings[j]) {
        _ele = $('<div class="layer-' + j + '"></div>');
        if ($.isFunction(layer.settings[j])) {
          _ele = layer.settings[j](j, _ele, ele, layer);
        } else {
          _ele = _createEle(j, layer.settings[j], _ele, layer);
        }
        if (i < 4 || i === 7 || i === 6) {
          _box = ele;
        } else if (i === 5) {
          _box = ele.find('.layer-area');
        } else if (i === 8) {
          _box = ele.find('.layer-toolbar');
        } else {
          _box = 'body';
        }
        _ele.appendTo(_box);
      }
      return i++;
    });
  };
  _getWithoutAreaHeight = function(ele) {
    return ele.find('.layer-toolbar').outerHeight(true) + ele.find('.layer-menubar').outerHeight(true) + ele.find('.layer-statusbar').outerHeight(true) + ele.find('.layer-btns').outerHeight(true);
  };
  _adjustView = function(ele, data, layer, first) {
    var area, cont, layerView, ox, oy, props, _conf, _h;
    layerView = {
      wwidth: $(window).width(),
      wheight: $(window).height()
    };
    cont = ele.find('.layer-cont');
    area = ele.find('.layer-area');
    props = ['maxWidth', 'maxHeight', 'minWidth', 'minHeight', 'width', 'height', 'left', 'top'];
    if (!data._cont) {
      $.each(props, function(i, j) {
        var n, _j, _n, _prop;
        if (i < 6 && i > 3) {
          _j = _camelCase(j);
        }
        if (n = data[j] || !first && layer.settings.view[j] || layer.settings.ajax && layer.settings.ajax.enable && layer.settings.ajax['init' + _j]) {
          if ((_n = parseFloat(n) / 100) > 0 && String(n).indexOf('%') > 0) {
            if (i > 5) {
              _prop = props[i - 2];
              n = (layerView['w' + _prop] - Math.min(layerView[_prop], layerView['w' + _prop])) * _n;
            } else {
              n = parseFloat(layerView['w' + props[i % 2 + 4]]) * _n;
            }
          }
        } else if (i < 6 && i > 3 && first) {
          n = layerView['min' + _j] || ele['outer' + _j](true);
        }
        n = Math.ceil(parseFloat(n));
        $.isNumeric(n) && (layerView[j] = n);
        if (i < 6 && i > 3) {
          layerView['_' + j] = layerView[j];
          layerView[j] = Math.min(layerView[j], layerView['w' + j], layerView['max' + _j] || layerView['w' + j]);
        }
        return true;
      });
      _conf = $.extend(true, {}, (first ? data : layer._view), layerView);
    } else {
      if (data.height > (_h = layer._view.height - layer._view.withoutArea)) {
        area.css({
          'overflowY': 'scroll',
          height: _h
        });
        cont.css('height', data.height);
      }
      return;
    }
    ele.css(_conf);
    first && (_conf.withoutArea = _getWithoutAreaHeight(ele));
    ox = 'visible';
    oy = 'visible';
    if (layerView['_width'] > _conf.wwidth || layerView['_width'] > _conf.maxWidth || _conf.minWidth > _conf.wwidth || !first && layerView['_width'] < layer._view.width) {
      ox = 'scroll';
    }
    area.css('overflowX', ox);
    cont.css('width', layerView['_width'] - cont.outerWidth(true) + cont.width());
    if (layerView['_height'] > _conf.wheight || layerView['_height'] > _conf.maxHeight || _conf.minHeight > _conf.wheight || !first && layerView['_height'] < layer._view.height) {
      oy = 'scroll';
    }
    area.css({
      'overflowY': oy,
      height: _conf.height - _conf.withoutArea
    });
    cont.css('height', layerView['_height'] - _conf.withoutArea);
    return layer._view = _conf;
  };
  _autoClose = function(ele, layer) {
    if (layer.settings.autoClose && layer.status !== 'hidden') {
      clearTimeout(layer._autoCloseTime);
      layer._autoCloseTime = null;
      return layer._autoCloseTime = setTimeout(function() {
        var close;
        if (!($.isFunction(layer.settings.callbacks.beforeAutoClose) && layer.settings.callbacks.beforeAutoClose(ele, layer) === false)) {
          layer.hide();
          $.isFunction(layer.settings.callbacks.afterAutoClose) && layer.settings.callbacks.afterAutoClose(ele, layer);
          if (layer.status !== 'hidden') {
            if ((close = ele.find('.btn-layer-close')).length) {
              return close.trigger('click.layer');
            } else if ($.isFunction(layer.settings.callbacks.close)) {
              return layer.settings.callbacks.close(null, ele, layer, null);
            } else {
              return layer.destroy();
            }
          }
        }
      }, layer.settings.autoClose);
    }
  };
  _unbindEvent = function(ele, layer) {
    var idx, _idx;
    ele.off('click.layer');
    if (layer.settings.esc && ~(idx = $.inArray(layer.idx, layer._escs))) {
      ~(_idx = $.inArray(layer.idx, layer.escQue)) && layer.escQue.splice(_idx, 1);
      layer._escs.splice(idx, 1);
      if (!layer._escs.length) {
        $(document).off('keyup.layer');
      }
    }
    if (layer._drag) {
      return ele.draggable('destroy');
    }
  };
  _bindEvent = function(ele, layer) {
    ele.on('click.layer', '.J_action-layer', function(e, eData) {
      var action, actionFns, i, self;
      self = $(this);
      action = self.data('action');
      if (~action.indexOf(',', 1)) {
        actionFns = action.split(',');
      } else if (action) {
        actionFns = [action];
      }
      if (actionFns) {
        i = 0;
        while (i < actionFns.length) {
          if ($.isFunction(layer.settings.callbacks[actionFns[i]]) && layer.settings.callbacks[actionFns[i]](e, ele, layer, eData) === false) {
            break;
          } else {
            ++i;
            continue;
          }
        }
        return void 0;
      }
    });
    if (layer.settings.drag && layer.settings.drag.enable) {
      require.async('jqueryui', function() {
        layer._drag = ele.draggable(layer.settings.drag);
        return $.each(['create', '', 'start', 'stop'], function(i, j) {
          var _fn;
          _fn = 'drag' + j;
          if ($.isFunction(layer.settings.callbacks[_fn])) {
            return ele.on(_fn + '.layer', function(e, ui) {
              return layer.settings.callbacks[_fn](e, ui, layer);
            });
          }
        });
      });
    }
    if (layer.settings.esc) {
      if (!layer._escs.length) {
        $(document).on('keyup.layer', function(e, eData) {
          var len;
          if (e.keyCode === 27) {
            len = layer.escQue.length;
            while (len-- > 0) {
              if (SX.layers[layer.escQue[len]].status !== 'hidden') {
                if ($.isFunction(SX.layers[layer.escQue[len]].settings.callbacks.close)) {
                  SX.layers[layer.escQue[len]].settings.callbacks.close(e, $('.layer-idx-' + SX.layers[layer.escQue[len]].idx), SX.layers[layer.escQue[len]], eData);
                } else {
                  SX.layers[layer.escQue[len]].destroy();
                }
              }
            }
            return void 0;
          }
        });
      }
      layer._escs.push(layer.idx);
      return layer.esc();
    }
  };
  isClassOrId = function(string) {
    var arr;
    return (arr = /^[\.\#](.+)/.exec(string)) && arr[1];
  };
  init = function(layer) {
    var ele;
    ele = $('<div lidx="' + layer.idx + '" class="m-layer layer-idx-' + layer.idx + ' ' + (layer.settings.lclass || '') + '" style="z-index:-999;left:-99999px;position:' + (layer.settings.view.position || 'fixed') + '"></div>');
    _createShelf(ele, layer);
    ele.appendTo('body');
    $.isFunction(layer.settings.callbacks.beforeShow) && layer.settings.callbacks.beforeShow(ele, layer);
    _adjustView(ele, layer.settings.view, layer, true);
    _bindEvent(ele, layer);
    if ($.isFunction(layer.settings.callbacks.afterOpen) && (!layer.settings.ajax || !layer.settings.ajax.enable)) {
      layer.settings.callbacks.afterOpen(ele, layer);
    }
    return _autoClose(ele, layer);
  };
  Layer.prototype.getLayer = function(idx) {
    if (!idx) {
      return this;
    } else {
      return SX.layers[idx];
    }
  };
  Layer.prototype.asyncIframeHeight = function(iframe) {
    var h, iframeDoc;
    if (!(iframe && iframe.length)) {
      return 0;
    }
    h = 0;
    try {
      iframeDoc = iframe[0].contentWindow.document;
      if (iframeDoc.body.scrollHeight && iframeDoc.documentElement.scrollHeight) {
        h = Math.max(iframeDoc.body.scrollHeight, iframeDoc.documentElement.scrollHeight);
      } else if (iframeDoc.documentElement.scrollHeight) {
        h = iframeDoc.documentElement.scrollHeight;
      } else if (iframeDoc.body.scrollHeight) {
        h = iframeDoc.body.scrollHeight;
      }
    } catch (_error) {}
    return h;
  };
  Layer.prototype.show = function(idx) {
    var layer, _layer;
    layer = idx ? SX.layers[idx] : this;
    if (layer) {
      layer.status = 'active';
      layer.esc();
      _layer = $('.layer-idx-' + layer.idx).css(layer._view).show();
      if (layer.settings.mask) {
        return $('.mask-' + layer.idx).show();
      }

      /* TODO  暂时不做处理，只加载一次
      if layer.settings.ajax and layer.settings.ajax.enable
        url = if typeof layer.settings.cont is 'string' then layer.settings.cont else layer.settings.cont.msg
        _asyncCont(url,_layer.find('.layer-cont'),layer)
       */
    }
  };
  Layer.prototype.hide = function(idx) {
    var layer, _idx, _layer;
    layer = idx ? SX.layers[idx] : this;
    if (layer) {
      _layer = $('.layer-idx-' + layer.idx).hide();
      layer.status = 'hidden';
      if (layer._autoCloseTime) {
        clearTimeout(layer._autoCloseTime);
        layer._autoCloseTime = null;
      }
      ~(_idx = $.inArray(layer.idx, layer.escQue)) && layer.escQue.splice(_idx, 1);
      layer.settings.mask && $('.mask-' + layer.idx).hide();
      if (layer.settings.ajax && layer.settings.ajax.enable) {
        if (layer.settings.ajax.carrier === 'iframe') {
          return _layer.find('.layer-iframe').attr('src', 'javascript:;');
        } else {
          return layer.ajax && layer.ajax.abort();
        }
      }
    }
  };
  Layer.prototype.destroy = function(idx) {
    var layer, _layer;
    layer = idx ? SX.layers[idx] : this;
    if (layer) {
      layer.hide();
      _layer = $('.layer-idx-' + layer.idx);
      _unbindEvent(_layer, layer);
      _layer.remove();
      layer.settings.mask && $('.mask-' + layer.idx).remove();
      layer.settings = null;
      layer._drag = null;
      delete SX.layers[layer.idx];
      return layer = null;
    }
  };
  Layer.prototype.esc = function(idx) {
    var idxs, self;
    self = this;
    if (!idx) {
      idxs = [self.idx];
    } else if (idx) {
      idxs = idx.split(',');
    }
    if (idxs) {
      self.escQue.length = 0;
      return $.each(idxs, function(i, j) {
        if (SX.layers[j] && SX.layers[j].status !== 'hidden' && ~$.inArray(j, self._escs)) {
          return self.escQue.push(j);
        }
      });
    }
  };
  Layer.prototype.autoArea = function(data) {
    var _layer;
    if ($.isPlainObject(data) && (_layer = $('.layer-idx-' + this.idx)).length) {
      return _adjustView(_layer, data, this, false);
    }
  };
  layer = function(conf) {
    return new Layer(conf);
  };
  $.each(['alert', 'confirm', 'load', 'iframe'], function(i, j) {
    return layer[j] = function(msg, opt) {
      var conf;
      conf = {
        cont: msg
      };
      if (i === 0) {
        conf.btns = 1;
      } else if (i === 1) {
        conf.btns = 2;
      } else {
        conf.ajax = {
          enable: true
        };
        if (i === 3) {
          conf.ajax.carrier = 'iframe';
        }
      }
      if ($.isFunction(opt)) {
        conf.callbacks = {};
        if (i < 2) {
          conf.callbacks.ok = function(e, ele, layer, data) {
            return opt(e, ele, layer, data);
          };
        } else {
          conf.callbacks.afterLoadSucc = function(ele, layer) {
            return opt(ele, layer);
          };
        }
      } else if ($.isPlainObject(opt)) {
        $.extend(true, conf, opt);
      } else if (typeof opt === 'string') {
        conf.title = opt;
      }
      return new Layer(conf);
    };
  });
  layer.tip = function(conf, opt) {
    var _conf;
    _conf = {
      cont: conf,
      title: false,
      operates: false,
      toolbar: false,
      drag: false,
      mask: false
    };
    $.extend(true, _conf, opt);
    return new Layer(_conf);
  };
  $.fn.layer = function(conf) {
    var _layer;
    _layer = new Layer(conf);
    $(this).attr('lidx', _layer.idx);
    return _layer;
  };
  return layer;
});
