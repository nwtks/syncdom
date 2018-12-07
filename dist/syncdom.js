'use strict';

var ELEMENT_NODE = 1;
var LISTENERS = [
  'onfocus',
  'onblur',
  'onfocusin',
  'onfocusout',
  'onsubmit',
  'onreset',
  'onchange',
  'oninput',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'oncompositionstart',
  'oncompositionend',
  'oncompositionupdate',
  'onclick',
  'ondblclick',
  'onmouseenter',
  'onmouseleave',
  'onmouseover',
  'onmouseout',
  'onmousedown',
  'onmouseup',
  'onmousemove',
  'onwheel',
  'ontouchstart',
  'ontouchend',
  'ontouchmove',
  'ontouchcancel',
  'ondrag',
  'ondrop',
  'ondragstart',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'onscroll',
  'onresize',
  'onselect',
  'onerror',
  'onload',
  'onunload',
  'onbeforeunload',
  'onabort',
  'onhashchange',
  'oncontextmenu',
  'onpageshow',
  'onpagehide',
  'onvisibilitychange',
  'oninvalid'
];

var isArray = Array.isArray;
var getOwnPropertyNames = Object.getOwnPropertyNames;

var sync = function (parent, node) {
  if (isArray(node)) {
    syncChildren(parent, node);
  } else if (node != null) {
    syncChildren(parent, [node]);
  } else {
    removeChildren(parent);
  }
};

var syncChildren = function (parent, nodes) {
  if (parent.nodeName === 'TEXTAREA') {
    return
  }

  var nodeKeys = nodes.map(function (n) { return ({ node: n, key: getKey(n) }); });
  var oldKeyedNodes = getKeyedNodes(parent, nodeKeys);

  var oldNode = parent.firstChild;
  nodeKeys.forEach(function (n) {
    var node = n.node;
    var key = n.key;
    var oldKeyed = key ? oldKeyedNodes[key] : null;
    if (oldKeyed) {
      delete oldKeyedNodes[key];
      syncNode(oldKeyed, node);
      if (oldKeyed === oldNode) {
        oldNode = oldNode.nextSibling;
      } else {
        insertBefore(parent, oldKeyed, oldNode);
      }
    } else if (oldNode) {
      if (key) {
        insertBefore(parent, node, oldNode);
      } else {
        for (;;) {
          if (oldNode) {
            if (containsValue(oldKeyedNodes, oldNode)) {
              oldNode = oldNode.nextSibling;
            } else {
              syncNode(oldNode, node);
              oldNode = oldNode.nextSibling;
              break
            }
          } else {
            appendChild(parent, node);
            break
          }
        }
      }
    } else {
      appendChild(parent, node);
    }
  });

  removeKeyedNodes(parent, oldKeyedNodes);
  removeOldNodes(parent, nodes);
};

var syncNode = function (oldNode, node) {
  if (oldNode.nodeType === node.nodeType) {
    if (oldNode.nodeType === ELEMENT_NODE) {
      if (isSameNode(oldNode, node)) {
        return
      }
      if (oldNode.nodeName === node.nodeName) {
        syncAttrs(oldNode, node);
        var children = [];
        for (var child = node.firstChild; child; child = child.nextSibling) {
          children.push(child);
        }
        syncChildren(oldNode, children);
      } else {
        replaceNode(oldNode, node);
      }
    } else {
      if (oldNode.nodeValue !== node.nodeValue) {
        oldNode.nodeValue = node.nodeValue;
      }
    }
  } else {
    replaceNode(oldNode, node);
  }
};

var getKeyedNodes = function (parent, nodeKeys) {
  var keys = nodeKeys.map(function (n) { return n.key; }).filter(function (k) { return k; });
  var keyedNodes = Object.create(null);
  for (var node = parent.firstChild; node; node = node.nextSibling) {
    var k = getKey(node);
    if (k) {
      if (keys.indexOf(k) >= 0) {
        keyedNodes[k] = node;
      } else {
        removeChild(parent, node);
      }
    }
  }
  return keyedNodes
};

var removeKeyedNodes = function (parent, keyedNodes) { return getOwnPropertyNames(keyedNodes).forEach(function (k) { return removeChild(parent, keyedNodes[k]); }
  ); };

var removeOldNodes = function (parent, nodes) {
  for (
    var overCount = parent.childNodes.length - nodes.length;
    overCount > 0;
    overCount -= 1
  ) {
    removeChild(parent, parent.lastChild);
  }
};

var syncAttrs = function (oldNode, node) {
  removeAttrs(oldNode, node);
  updateAttrs(oldNode, node);
  syncListeners(oldNode, node);
  syncFormProps(oldNode, node);
};

var removeAttrs = function (oldNode, node) {
  var oldAttrs = oldNode.attributes;
  for (var i = oldAttrs.length - 1; i >= 0; i -= 1) {
    var a = oldAttrs[i];
    var ns = a.namespaceURI;
    var n = a.localName;
    if (!node.hasAttributeNS(ns, n) && oldNode.hasAttributeNS(ns, n)) {
      oldNode.removeAttributeNS(ns, n);
    }
  }
};

var updateAttrs = function (oldNode, node) {
  var attrs = node.attributes;
  for (var i = attrs.length - 1; i >= 0; i -= 1) {
    var a = attrs[i];
    var ns = a.namespaceURI;
    var n = a.localName;
    var v1 = node.getAttributeNS(ns, n);
    var v2 = oldNode.getAttributeNS(ns, n);
    if (v1 !== v2) {
      oldNode.setAttributeNS(ns, n, v1);
    }
  }
};

var syncListeners = function (oldNode, node) {
  LISTENERS.forEach(function (k) {
    var f = node[k];
    if (f) {
      if (f !== oldNode[k]) {
        oldNode[k] = f;
      }
    } else {
      if (oldNode[k]) {
        oldNode[k] = void 0;
      }
    }
  });
};

var syncFormProps = function (oldNode, node) {
  var name = oldNode.nodeName;
  if (name === 'INPUT') {
    syncBoolProp(oldNode, node, 'checked');
    var value = node.value;
    if (oldNode.value !== value) {
      oldNode.value = value;
    }
    if (
      !node.hasAttributeNS(null, 'value') &&
      oldNode.hasAttributeNS(null, 'value')
    ) {
      oldNode.removeAttributeNS(null, 'value');
    }
  } else if (name === 'TEXTAREA') {
    var value2 = node.value;
    if (oldNode.value !== value2) {
      oldNode.value = value2;
    }
  } else if (name === 'OPTION') {
    syncBoolProp(oldNode, node, 'selected');
  }
};

var syncBoolProp = function (oldNode, node, name) {
  if (oldNode[name] !== node[name]) {
    oldNode[name] = node[name];
    if (oldNode[name]) {
      if (!oldNode.hasAttributeNS(null, name)) {
        oldNode.setAttributeNS(null, name, '');
      }
    } else {
      if (oldNode.hasAttributeNS(null, name)) {
        oldNode.removeAttributeNS(null, name);
      }
    }
  }
};

var isSameNode = function (n1, n2) {
  var eq1 = n1.getAttributeNS(null, 'domsame');
  var eq2 = n2.getAttributeNS(null, 'domsame');
  return (eq1 && eq2 && eq1 === eq2) || n2.isSameNode(n1)
};

var getKey = function (n) { return n.nodeType === ELEMENT_NODE ? n.getAttributeNS(null, 'domkey') : null; };

var removeChildren = function (parent) {
  for (
    var lastChild = parent.lastChild;
    lastChild;
    lastChild = parent.lastChild
  ) {
    removeChild(parent, lastChild);
  }
};

var replaceNode = function (oldNode, node) { return oldNode.parentNode.replaceChild(node, oldNode); };

var appendChild = function (parent, node) { return parent.appendChild(node); };

var insertBefore = function (parent, node, position) { return parent.insertBefore(node, position); };

var removeChild = function (parent, node) { return parent.removeChild(node); };

var containsValue = function (obj, v) { return obj != null &&
  getOwnPropertyNames(obj).reduce(function (a, k) { return (obj[k] === v ? true : a); }, false); };

module.exports = sync;
