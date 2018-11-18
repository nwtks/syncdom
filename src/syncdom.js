const NODE_ELEMENT = 1

function syncDom(oldNode, newNode) {
  if (oldNode.nodeType === newNode.nodeType) {
    if (oldNode.nodeType === NODE_ELEMENT) {
      if (isSameNode(oldNode, newNode)) {
        return
      }
      syncChildren(oldNode, newNode)
      if (oldNode.nodeName === newNode.nodeName) {
        syncAttrs(oldNode, newNode)
      } else {
        while (newNode.lastChild) {
          newNode.removeChild(newNode.lastChild)
        }
        while (oldNode.firstChild) {
          newNode.appendChild(oldNode.firstChild)
        }
        oldNode.parentNode.replaceChild(newNode, oldNode)
      }
    } else {
      if (oldNode.nodeValue !== newNode.nodeValue) {
        oldNode.nodeValue = newNode.nodeValue
      }
    }
  } else {
    oldNode.parentNode.replaceChild(newNode, oldNode)
  }
}

function syncChildren(oldParent, newParent) {
  const newKeys = []
  const newNodes = []
  let newNext = newParent.firstChild
  while (newNext) {
    const newNode = newNext
    newNext = newNext.nextSibling
    const key = getKey(newNode)
    newNodes.push({ node: newNode, key: key })
    if (key) {
      newKeys.push(key)
    }
  }

  const oldKeyedNodes = Object.create(null)
  let oldNext = oldParent.firstChild
  while (oldNext) {
    const oldNode = oldNext
    oldNext = oldNext.nextSibling
    const key = getKey(oldNode)
    if (key) {
      if (newKeys.indexOf(key) >= 0) {
        oldKeyedNodes[key] = oldNode
      } else {
        oldParent.removeChild(oldNode)
      }
    }
  }

  oldNext = oldParent.firstChild
  newNodes.forEach(n => {
    const newNode = n.node
    const key = n.key
    const oldKeyed = key ? oldKeyedNodes[key] : null
    if (oldKeyed) {
      delete oldKeyedNodes[key]
      if (oldKeyed === oldNext) {
        oldNext = oldNext.nextSibling
      } else {
        oldParent.insertBefore(oldKeyed, oldNext)
      }
      syncDom(oldKeyed, newNode)
    } else if (oldNext) {
      if (key) {
        oldParent.insertBefore(newNode, oldNext)
      } else {
        while (true) {
          if (!oldNext) {
            oldParent.appendChild(newNode)
            break
          }
          const oldNode = oldNext
          oldNext = oldNext.nextSibling
          if (!containsValue(oldKeyedNodes, oldNode)) {
            syncDom(oldNode, newNode)
            break
          }
        }
      }
    } else {
      oldParent.appendChild(newNode)
    }
  })

  for (const oldKey in oldKeyedNodes) {
    oldParent.removeChild(oldKeyedNodes[oldKey])
  }

  let overCount = oldParent.childNodes.length - newNodes.length
  while (--overCount >= 0) {
    oldParent.removeChild(oldParent.lastChild)
  }
}

function syncAttrs(oldNode, newNode) {
  const oldAttrs = oldNode.attributes
  for (let i = oldAttrs.length - 1; i >= 0; i -= 1) {
    const a = oldAttrs[i]
    const ns = a.namespaceURI
    const n = a.localName
    if (!newNode.hasAttributeNS(ns, n)) {
      oldNode.removeAttributeNS(ns, n)
    }
  }

  const newAttrs = newNode.attributes
  for (let i = newAttrs.length - 1; i >= 0; i -= 1) {
    const a = newAttrs[i]
    const ns = a.namespaceURI
    const n = a.localName
    const v1 = newNode.getAttributeNS(ns, n)
    const v2 = oldNode.getAttributeNS(ns, n)
    if (v1 !== v2) {
      oldNode.setAttributeNS(ns, n, v1)
    }
  }

  const name = oldNode.nodeName
  if (name === 'INPUT') {
    syncBoolProp(oldNode, newNode, 'checked')
    const value = newNode.value
    if (oldNode.value !== value) {
      oldNode.value = value
    }
    if (!newNode.hasAttributeNS(null, 'value')) {
      oldNode.removeAttribute('value')
    }
  } else if (name === 'TEXTAREA') {
    const value = newNode.value
    if (oldNode.value !== value) {
      oldNode.value = value
    }
  } else if (name === 'OPTION') {
    syncBoolProp(oldNode, newNode, 'selected')
  }
}

function syncBoolProp(oldNode, newNode, name) {
  if (oldNode[name] !== newNode[name]) {
    oldNode[name] = newNode[name]
    if (oldNode[name]) {
      oldNode.setAttribute(name, '')
    } else {
      oldNode.removeAttribute(name)
    }
  }
}

function isSameNode(n1, n2) {
  const eq1 = n1.getAttribute('data-domsame')
  const eq2 = n2.getAttribute('data-domsame')
  return (eq1 && eq2 && eq1 === eq2) || n2.isSameNode(n1)
}

function getKey(n) {
  if (n.nodeType === NODE_ELEMENT) {
    return n.getAttribute('data-domkey')
  }
}

function containsValue(obj, v) {
  for (const k in obj) {
    if (obj[k] === v) {
      return true
    }
  }
  return false
}

export default syncDom
