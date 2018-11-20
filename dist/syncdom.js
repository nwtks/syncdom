'use strict';

var NODE_ELEMENT = 1;

function syncDom(oldNode, newNode) {
  if (oldNode.nodeType === newNode.nodeType) {
    if (oldNode.nodeType === NODE_ELEMENT) {
      if (isSameNode(oldNode, newNode)) {
        return
      }
      syncChildren(oldNode, newNode);
      if (oldNode.nodeName === newNode.nodeName) {
        syncAttrs(oldNode, newNode);
      } else {
        while (newNode.lastChild) {
          newNode.removeChild(newNode.lastChild);
        }
        while (oldNode.firstChild) {
          newNode.appendChild(oldNode.firstChild);
        }
        oldNode.parentNode.replaceChild(newNode, oldNode);
      }
    } else {
      if (oldNode.nodeValue !== newNode.nodeValue) {
        oldNode.nodeValue = newNode.nodeValue;
      }
    }
  } else {
    oldNode.parentNode.replaceChild(newNode, oldNode);
  }
}

function syncChildren(oldParent, newParent) {
  var newKeys = [];
  var newNodes = [];
  for (var nNode = newParent.firstChild; nNode; nNode = nNode.nextSibling) {
    var nKey = getKey(nNode);
    newNodes.push({ node: nNode, key: nKey });
    if (nKey) {
      newKeys.push(nKey);
    }
  }

  var oldKeyedNodes = Object.create(null);
  for (var oNode = oldParent.firstChild; oNode; oNode = oNode.nextSibling) {
    var oKey = getKey(oNode);
    if (oKey) {
      if (newKeys.indexOf(oKey) >= 0) {
        oldKeyedNodes[oKey] = oNode;
      } else {
        oldParent.removeChild(oNode);
      }
    }
  }

  var oldNext = oldParent.firstChild;
  newNodes.forEach(function (n) {
    var newNode = n.node;
    var key = n.key;
    var oldKeyed = key ? oldKeyedNodes[key] : null;
    if (oldKeyed) {
      delete oldKeyedNodes[key];
      if (oldKeyed === oldNext) {
        oldNext = oldNext.nextSibling;
      } else {
        oldParent.insertBefore(oldKeyed, oldNext);
      }
      syncDom(oldKeyed, newNode);
    } else if (oldNext) {
      if (key) {
        oldParent.insertBefore(newNode, oldNext);
      } else {
        while (true) {
          if (!oldNext) {
            oldParent.appendChild(newNode);
            break
          }
          var oldNode = oldNext;
          oldNext = oldNext.nextSibling;
          if (!containsValue(oldKeyedNodes, oldNode)) {
            syncDom(oldNode, newNode);
            break
          }
        }
      }
    } else {
      oldParent.appendChild(newNode);
    }
  });

  for (var key in oldKeyedNodes) {
    oldParent.removeChild(oldKeyedNodes[key]);
  }

  var overCount = oldParent.childNodes.length - newNodes.length;
  while (--overCount >= 0) {
    oldParent.removeChild(oldParent.lastChild);
  }
}

function syncAttrs(oldNode, newNode) {
  var oldAttrs = oldNode.attributes;
  for (var i = oldAttrs.length - 1; i >= 0; i -= 1) {
    var a = oldAttrs[i];
    var ns = a.namespaceURI;
    var n = a.localName;
    if (!newNode.hasAttributeNS(ns, n)) {
      oldNode.removeAttributeNS(ns, n);
    }
  }

  var newAttrs = newNode.attributes;
  for (var i$1 = newAttrs.length - 1; i$1 >= 0; i$1 -= 1) {
    var a$1 = newAttrs[i$1];
    var ns$1 = a$1.namespaceURI;
    var n$1 = a$1.localName;
    var v1 = newNode.getAttributeNS(ns$1, n$1);
    var v2 = oldNode.getAttributeNS(ns$1, n$1);
    if (v1 !== v2) {
      oldNode.setAttributeNS(ns$1, n$1, v1);
    }
  }

  var name = oldNode.nodeName;
  if (name === 'INPUT') {
    syncBoolProp(oldNode, newNode, 'checked');
    var value = newNode.value;
    if (oldNode.value !== value) {
      oldNode.value = value;
    }
    if (!newNode.hasAttributeNS(null, 'value')) {
      oldNode.removeAttribute('value');
    }
  } else if (name === 'TEXTAREA') {
    var value$1 = newNode.value;
    if (oldNode.value !== value$1) {
      oldNode.value = value$1;
    }
  } else if (name === 'OPTION') {
    syncBoolProp(oldNode, newNode, 'selected');
  }
}

function syncBoolProp(oldNode, newNode, name) {
  if (oldNode[name] !== newNode[name]) {
    oldNode[name] = newNode[name];
    if (oldNode[name]) {
      oldNode.setAttribute(name, '');
    } else {
      oldNode.removeAttribute(name);
    }
  }
}

function isSameNode(n1, n2) {
  var eq1 = n1.getAttribute('data-domsame');
  var eq2 = n2.getAttribute('data-domsame');
  return (eq1 && eq2 && eq1 === eq2) || n2.isSameNode(n1)
}

function getKey(n) {
  if (n.nodeType === NODE_ELEMENT) {
    return n.getAttribute('data-domkey')
  }
}

function containsValue(obj, v) {
  for (var k in obj) {
    if (obj[k] === v) {
      return true
    }
  }
  return false
}

module.exports = syncDom;
