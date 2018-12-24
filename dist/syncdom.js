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
var ref = Array.prototype;
var slice = ref.slice;

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
    return;
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
              break;
            }
          } else {
            appendChild(parent, node);
            break;
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
        return;
      }
      if (oldNode.nodeName === node.nodeName) {
        syncAttrs(oldNode, node);
        var children = [];
        walkChildren(node, function (child) {
          children.push(child);
        });
        syncChildren(oldNode, children);
      } else {
        replaceNode(oldNode, node);
      }
    } else {
      oldNode.nodeValue !== node.nodeValue &&
        (oldNode.nodeValue = node.nodeValue);
    }
  } else {
    replaceNode(oldNode, node);
  }
};

var getKeyedNodes = function (parent, nodeKeys) {
  var keys = nodeKeys.map(function (n) { return n.key; }).filter(function (k) { return k; });
  var keyedNodes = Object.create(null);
  walkChildren(parent, function (node) {
    var nodeKey = getKey(node);
    if (nodeKey) {
      if (keys.indexOf(nodeKey) >= 0) {
        keyedNodes[nodeKey] = node;
      } else {
        removeChild(parent, node);
      }
    }
  });
  return keyedNodes;
};

var removeKeyedNodes = function (parent, keyedNodes) {
  getOwnPropertyNames(keyedNodes).forEach(function (k) {
    removeChild(parent, keyedNodes[k]);
  });
};

var removeOldNodes = function (parent, nodes) {
  times(parent.childNodes.length - nodes.length, function () {
    removeChild(parent, parent.lastChild);
  });
};

var syncAttrs = function (oldNode, node) {
  removeAttrs(oldNode, node);
  updateAttrs(oldNode, node);
  syncListeners(oldNode, node);
  syncFormProps(oldNode, node);
};

var removeAttrs = function (oldNode, node) {
  slice.call(oldNode.attributes).forEach(function (a) {
    var ns = a.namespaceURI;
    var n = a.localName;
    !node.hasAttributeNS(ns, n) &&
      oldNode.hasAttributeNS(ns, n) &&
      oldNode.removeAttributeNS(ns, n);
  });
};

var updateAttrs = function (oldNode, node) {
  slice.call(node.attributes).forEach(function (a) {
    var ns = a.namespaceURI;
    var n = a.localName;
    var v1 = node.getAttributeNS(ns, n);
    var v2 = oldNode.getAttributeNS(ns, n);
    v1 !== v2 && oldNode.setAttributeNS(ns, n, v1);
  });
};

var syncListeners = function (oldNode, node) {
  LISTENERS.forEach(function (k) {
    var f = node[k];
    if (f) {
      f !== oldNode[k] && (oldNode[k] = f);
    } else {
      oldNode[k] && (oldNode[k] = void 0);
    }
  });
};

var syncFormProps = function (oldNode, node) {
  var name = oldNode.nodeName;
  if (name === 'INPUT') {
    syncBoolProp(oldNode, node, 'checked');
    var value = node.value;
    oldNode.value !== value && (oldNode.value = value);
    !node.hasAttributeNS(null, 'value') &&
      oldNode.hasAttributeNS(null, 'value') &&
      oldNode.removeAttributeNS(null, 'value');
  } else if (name === 'TEXTAREA') {
    var value2 = node.value;
    oldNode.value !== value2 && (oldNode.value = value2);
  } else if (name === 'OPTION') {
    syncBoolProp(oldNode, node, 'selected');
  }
};

var syncBoolProp = function (oldNode, node, name) {
  if (oldNode[name] !== node[name]) {
    oldNode[name] = node[name];
    if (oldNode[name]) {
      !oldNode.hasAttributeNS(null, name) &&
        oldNode.setAttributeNS(null, name, '');
    } else {
      oldNode.hasAttributeNS(null, name) &&
        oldNode.removeAttributeNS(null, name);
    }
  }
};

var isSameNode = function (node1, node2) {
  var same1 = node1.getAttributeNS(null, 'domsame');
  var same2 = node2.getAttributeNS(null, 'domsame');
  return (same1 && same2 && same1 === same2) || node2.isSameNode(node1);
};

var getKey = function (node) { return node.nodeType === ELEMENT_NODE ? node.getAttributeNS(null, 'domkey') : null; };

var removeChildren = function (parent) {
  for (
    var lastChild = parent.lastChild;
    lastChild;
    lastChild = parent.lastChild
  ) {
    removeChild(parent, lastChild);
  }
};

var replaceNode = function (oldNode, node) {
  oldNode.parentNode.replaceChild(node, oldNode);
};

var appendChild = function (parent, node) {
  parent.appendChild(node);
};

var insertBefore = function (parent, node, position) {
  parent.insertBefore(node, position);
};

var removeChild = function (parent, node) {
  parent.removeChild(node);
};

var containsValue = function (obj, value) { return obj != null && getOwnPropertyNames(obj).some(function (k) { return obj[k] === value; }); };

var walkChildren = function (node, callback) {
  for (var c = node.firstChild; c; c = c.nextSibling) {
    callback(c);
  }
};

var times = function (n, callback) {
  for (var i = 0; i < n; i += 1) {
    callback(i);
  }
};

module.exports = sync;
