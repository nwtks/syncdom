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
        const newPrev = newNode.cloneNode()
        while (oldNode.firstChild) {
          newPrev.appendChild(oldNode.firstChild)
        }
        oldNode.parentNode.replaceChild(newPrev, oldNode)
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
  const keyedNodes = Object.create(null)
  let oldNext = oldParent.firstChild
  while (oldNext) {
    const oldNode = oldNext
    oldNext = oldNext.nextSibling
    const key = getKey(oldNode)
    if (key) {
      keyedNodes[key] = oldNode
    }
  }

  oldNext = oldParent.firstChild
  let newNext = newParent.firstChild
  let newCount = 0
  while (newNext) {
    newCount += 1
    const newNode = newNext
    newNext = newNext.nextSibling
    const key = getKey(newNode)
    const keyedOld = key ? keyedNodes[key] : null
    if (keyedOld) {
      delete keyedNodes[key]
      if (keyedOld === oldNext) {
        oldNext = oldNext.nextSibling
      } else {
        oldParent.insertBefore(keyedOld, oldNext)
      }
      syncDom(keyedOld, newNode)
    } else if (oldNext) {
      const oldNode = oldNext
      oldNext = oldNext.nextSibling
      if (containsValue(keyedNodes, oldNode)) {
        oldParent.insertBefore(newNode, oldNode)
      } else {
        syncDom(oldNode, newNode)
      }
    } else {
      oldParent.appendChild(newNode)
    }
  }

  for (const key in keyedNodes) {
    oldParent.removeChild(keyedNodes[key])
  }

  let overCount = oldParent.childNodes.length - newCount
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
    syncBoolProp(oldNode, newNode, 'disabled')
    syncBoolProp(oldNode, newNode, 'readOnly')
    const value = newNode.value
    if (oldNode.value !== value) {
      oldNode.value = value
    }
    if (!newNode.hasAttributeNS(null, 'value')) {
      oldNode.removeAttribute('value')
    }
  } else if (name === 'TEXTAREA') {
    syncBoolProp(oldNode, newNode, 'disabled')
    syncBoolProp(oldNode, newNode, 'readOnly')
    const value = newNode.value
    if (oldNode.value !== value) {
      oldNode.value = value
    }
  } else if (name === 'OPTION') {
    syncBoolProp(oldNode, newNode, 'selected')
    syncBoolProp(oldNode, newNode, 'disabled')
  } else if (name === 'SELECT') {
    syncBoolProp(oldNode, newNode, 'disabled')
  }
}

function syncBoolProp(oldNode, newNode, name) {
  if (oldNode[name] !== newNode[name]) {
    oldNode[name] = newNode[name]
    if (oldNode[name]) {
      oldNode.setAttribute(name.toLowerCase(), '')
    } else {
      oldNode.removeAttribute(name.toLowerCase())
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
