const ELEMENT_NODE = 1

const isArray = Array.isArray

function sync(parent, node) {
  if (isArray(node)) {
    syncChildren(parent, node)
  } else if (node != null) {
    syncChildren(parent, [node])
  } else {
    removeChildren(parent)
  }
}

function syncChildren(parent, nodes) {
  if (parent.nodeName === 'TEXTAREA') {
    return
  }

  const nodeKeys = nodes.map(n => ({ node: n, key: getKey(n) }))
  const oldKeyedNodes = getKeyedNodes(parent, nodeKeys)

  let oldNode = parent.firstChild
  nodeKeys.forEach(n => {
    const node = n.node
    const key = n.key
    const oldKeyed = key ? oldKeyedNodes[key] : null
    if (oldKeyed) {
      delete oldKeyedNodes[key]
      syncNode(oldKeyed, node)
      if (oldKeyed === oldNode) {
        oldNode = oldNode.nextSibling
      } else {
        insertBefore(parent, oldKeyed, oldNode)
      }
    } else if (oldNode) {
      if (key) {
        insertBefore(parent, node, oldNode)
      } else {
        for (;;) {
          if (oldNode) {
            if (containsValue(oldKeyedNodes, oldNode)) {
              oldNode = oldNode.nextSibling
            } else {
              syncNode(oldNode, node)
              oldNode = oldNode.nextSibling
              break
            }
          } else {
            appendChild(parent, node)
            break
          }
        }
      }
    } else {
      appendChild(parent, node)
    }
  })

  removeKeyedNodes(parent, oldKeyedNodes)
  removeOldNodes(parent, nodes)
}

function syncNode(oldNode, node) {
  if (oldNode.nodeType === node.nodeType) {
    if (oldNode.nodeType === ELEMENT_NODE) {
      if (isSameNode(oldNode, node)) {
        return
      }
      if (oldNode.nodeName === node.nodeName) {
        syncAttrs(oldNode, node)
        const children = []
        for (let child = node.firstChild; child; child = child.nextSibling) {
          children.push(child)
        }
        syncChildren(oldNode, children)
      } else {
        replaceNode(oldNode, node)
      }
    } else {
      if (oldNode.nodeValue !== node.nodeValue) {
        oldNode.nodeValue = node.nodeValue
      }
    }
  } else {
    replaceNode(oldNode, node)
  }
}

function getKeyedNodes(parent, nodeKeys) {
  const keys = nodeKeys.map(n => n.key).filter(k => k)
  const keyedNodes = Object.create(null)
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    const k = getKey(node)
    if (k) {
      if (keys.indexOf(k) >= 0) {
        keyedNodes[k] = node
      } else {
        removeChild(parent, node)
      }
    }
  }
  return keyedNodes
}

function removeKeyedNodes(parent, keyedNodes) {
  for (const k in keyedNodes) {
    removeChild(parent, keyedNodes[k])
  }
}

function removeOldNodes(parent, nodes) {
  for (
    let overCount = parent.childNodes.length - nodes.length;
    overCount > 0;
    --overCount
  ) {
    removeChild(parent, parent.lastChild)
  }
}

function syncAttrs(oldNode, node) {
  delAttrs(oldNode, node)
  setAttrs(oldNode, node)
  syncFormProp(oldNode, node)
}

function delAttrs(oldNode, node) {
  const oldAttrs = oldNode.attributes
  for (let i = oldAttrs.length - 1; i >= 0; --i) {
    const a = oldAttrs[i]
    const ns = a.namespaceURI
    const n = a.localName
    if (!node.hasAttributeNS(ns, n)) {
      oldNode.removeAttributeNS(ns, n)
    }
  }
}

function setAttrs(oldNode, node) {
  const attrs = node.attributes
  for (let i = attrs.length - 1; i >= 0; --i) {
    const a = attrs[i]
    const ns = a.namespaceURI
    const n = a.localName
    const v1 = node.getAttributeNS(ns, n)
    const v2 = oldNode.getAttributeNS(ns, n)
    if (v1 !== v2) {
      oldNode.setAttributeNS(ns, n, v1)
    }
  }
}

function syncFormProp(oldNode, node) {
  const name = oldNode.nodeName
  if (name === 'INPUT') {
    syncBoolProp(oldNode, node, 'checked')
    const value = node.value
    if (oldNode.value !== value) {
      oldNode.value = value
    }
    if (!node.hasAttributeNS(null, 'value')) {
      oldNode.removeAttribute('value')
    }
  } else if (name === 'TEXTAREA') {
    const value2 = node.value
    if (oldNode.value !== value2) {
      oldNode.value = value2
    }
  } else if (name === 'OPTION') {
    syncBoolProp(oldNode, node, 'selected')
  }
}

function syncBoolProp(oldNode, node, name) {
  if (oldNode[name] !== node[name]) {
    oldNode[name] = node[name]
    if (oldNode[name]) {
      oldNode.setAttribute(name, '')
    } else {
      oldNode.removeAttribute(name)
    }
  }
}

function isSameNode(n1, n2) {
  const eq1 = n1.getAttribute('domsame')
  const eq2 = n2.getAttribute('domsame')
  return (eq1 && eq2 && eq1 === eq2) || n2.isSameNode(n1)
}

function getKey(n) {
  if (n.nodeType === ELEMENT_NODE) {
    return n.getAttribute('domkey')
  }
}

function removeChildren(parent) {
  for (
    let lastChild = parent.lastChild;
    lastChild;
    lastChild = parent.lastChild
  ) {
    removeChild(parent, lastChild)
  }
}

function replaceNode(oldNode, node) {
  oldNode.parentNode.replaceChild(node, oldNode)
}

function appendChild(parent, node) {
  parent.appendChild(node)
}

function insertBefore(parent, node, position) {
  parent.insertBefore(node, position)
}

function removeChild(parent, node) {
  parent.removeChild(node)
}

function containsValue(obj, v) {
  for (const k in obj) {
    if (obj[k] === v) {
      return true
    }
  }
  return false
}

export default sync
