'use strict';

var ELEMENT_NODE = 1;

var isArray = Array.isArray;

function sync(parent, node) {
  if (isArray(node)) {
    syncChildren(parent, node);
  } else if (node != null) {
    syncChildren(parent, [node]);
  } else {
    removeChildren(parent);
  }
}

function syncChildren(parent, nodes) {
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
}

function syncNode(oldNode, node) {
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
}

function getKeyedNodes(parent, nodeKeys) {
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
}

function removeKeyedNodes(parent, keyedNodes) {
  for (var k in keyedNodes) {
    removeChild(parent, keyedNodes[k]);
  }
}

function removeOldNodes(parent, nodes) {
  for (
    var overCount = parent.childNodes.length - nodes.length;
    overCount > 0;
    --overCount
  ) {
    removeChild(parent, parent.lastChild);
  }
}

function syncAttrs(oldNode, node) {
  delAttrs(oldNode, node);
  setAttrs(oldNode, node);
  syncFormProp(oldNode, node);
}

function delAttrs(oldNode, node) {
  var oldAttrs = oldNode.attributes;
  for (var i = oldAttrs.length - 1; i >= 0; --i) {
    var a = oldAttrs[i];
    var ns = a.namespaceURI;
    var n = a.localName;
    if (!node.hasAttributeNS(ns, n)) {
      oldNode.removeAttributeNS(ns, n);
    }
  }
}

function setAttrs(oldNode, node) {
  var attrs = node.attributes;
  for (var i = attrs.length - 1; i >= 0; --i) {
    var a = attrs[i];
    var ns = a.namespaceURI;
    var n = a.localName;
    var v1 = node.getAttributeNS(ns, n);
    var v2 = oldNode.getAttributeNS(ns, n);
    if (v1 !== v2) {
      oldNode.setAttributeNS(ns, n, v1);
    }
  }
}

function syncFormProp(oldNode, node) {
  var name = oldNode.nodeName;
  if (name === 'INPUT') {
    syncBoolProp(oldNode, node, 'checked');
    var value = node.value;
    if (oldNode.value !== value) {
      oldNode.value = value;
    }
    if (!node.hasAttributeNS(null, 'value')) {
      oldNode.removeAttribute('value');
    }
  } else if (name === 'TEXTAREA') {
    var value2 = node.value;
    if (oldNode.value !== value2) {
      oldNode.value = value2;
    }
  } else if (name === 'OPTION') {
    syncBoolProp(oldNode, node, 'selected');
  }
}

function syncBoolProp(oldNode, node, name) {
  if (oldNode[name] !== node[name]) {
    oldNode[name] = node[name];
    if (oldNode[name]) {
      oldNode.setAttribute(name, '');
    } else {
      oldNode.removeAttribute(name);
    }
  }
}

function isSameNode(n1, n2) {
  var eq1 = n1.getAttribute('domsame');
  var eq2 = n2.getAttribute('domsame');
  return (eq1 && eq2 && eq1 === eq2) || n2.isSameNode(n1)
}

function getKey(n) {
  if (n.nodeType === ELEMENT_NODE) {
    return n.getAttribute('domkey')
  }
}

function removeChildren(parent) {
  for (
    var lastChild = parent.lastChild;
    lastChild;
    lastChild = parent.lastChild
  ) {
    removeChild(parent, lastChild);
  }
}

function replaceNode(oldNode, node) {
  oldNode.parentNode.replaceChild(node, oldNode);
}

function appendChild(parent, node) {
  parent.appendChild(node);
}

function insertBefore(parent, node, position) {
  parent.insertBefore(node, position);
}

function removeChild(parent, node) {
  parent.removeChild(node);
}

function containsValue(obj, v) {
  for (var k in obj) {
    if (obj[k] === v) {
      return true
    }
  }
  return false
}

module.exports = sync;
