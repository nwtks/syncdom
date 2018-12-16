const ELEMENT_NODE = 1
const LISTENERS = [
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
]

const isArray = Array.isArray
const getOwnPropertyNames = Object.getOwnPropertyNames
const slice = Array.prototype.slice

const sync = (parent, node) => {
  if (isArray(node)) {
    syncChildren(parent, node)
  } else if (node != null) {
    syncChildren(parent, [node])
  } else {
    removeChildren(parent)
  }
}

const syncChildren = (parent, nodes) => {
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

const syncNode = (oldNode, node) => {
  if (oldNode.nodeType === node.nodeType) {
    if (oldNode.nodeType === ELEMENT_NODE) {
      if (isSameNode(oldNode, node)) {
        return
      }
      if (oldNode.nodeName === node.nodeName) {
        syncAttrs(oldNode, node)
        const children = []
        walkChildren(node, child => children.push(child))
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

const getKeyedNodes = (parent, nodeKeys) => {
  const keys = nodeKeys.map(n => n.key).filter(k => k)
  const keyedNodes = Object.create(null)
  walkChildren(parent, node => {
    const nodeKey = getKey(node)
    if (nodeKey) {
      if (keys.indexOf(nodeKey) >= 0) {
        keyedNodes[nodeKey] = node
      } else {
        removeChild(parent, node)
      }
    }
  })
  return keyedNodes
}

const removeKeyedNodes = (parent, keyedNodes) =>
  getOwnPropertyNames(keyedNodes).forEach(k =>
    removeChild(parent, keyedNodes[k])
  )

const removeOldNodes = (parent, nodes) => {
  times(parent.childNodes.length - nodes.length, () =>
    removeChild(parent, parent.lastChild)
  )
}

const syncAttrs = (oldNode, node) => {
  removeAttrs(oldNode, node)
  updateAttrs(oldNode, node)
  syncListeners(oldNode, node)
  syncFormProps(oldNode, node)
}

const removeAttrs = (oldNode, node) => {
  slice.call(oldNode.attributes).forEach(a => {
    const ns = a.namespaceURI
    const n = a.localName
    if (!node.hasAttributeNS(ns, n) && oldNode.hasAttributeNS(ns, n)) {
      oldNode.removeAttributeNS(ns, n)
    }
  })
}

const updateAttrs = (oldNode, node) => {
  slice.call(node.attributes).forEach(a => {
    const ns = a.namespaceURI
    const n = a.localName
    const v1 = node.getAttributeNS(ns, n)
    const v2 = oldNode.getAttributeNS(ns, n)
    if (v1 !== v2) {
      oldNode.setAttributeNS(ns, n, v1)
    }
  })
}

const syncListeners = (oldNode, node) => {
  LISTENERS.forEach(k => {
    const f = node[k]
    if (f) {
      if (f !== oldNode[k]) {
        oldNode[k] = f
      }
    } else {
      if (oldNode[k]) {
        oldNode[k] = void 0
      }
    }
  })
}

const syncFormProps = (oldNode, node) => {
  const name = oldNode.nodeName
  if (name === 'INPUT') {
    syncBoolProp(oldNode, node, 'checked')
    const value = node.value
    if (oldNode.value !== value) {
      oldNode.value = value
    }
    if (
      !node.hasAttributeNS(null, 'value') &&
      oldNode.hasAttributeNS(null, 'value')
    ) {
      oldNode.removeAttributeNS(null, 'value')
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

const syncBoolProp = (oldNode, node, name) => {
  if (oldNode[name] !== node[name]) {
    oldNode[name] = node[name]
    if (oldNode[name]) {
      if (!oldNode.hasAttributeNS(null, name)) {
        oldNode.setAttributeNS(null, name, '')
      }
    } else {
      if (oldNode.hasAttributeNS(null, name)) {
        oldNode.removeAttributeNS(null, name)
      }
    }
  }
}

const isSameNode = (n1, n2) => {
  const eq1 = n1.getAttributeNS(null, 'domsame')
  const eq2 = n2.getAttributeNS(null, 'domsame')
  return (eq1 && eq2 && eq1 === eq2) || n2.isSameNode(n1)
}

const getKey = node =>
  node.nodeType === ELEMENT_NODE ? node.getAttributeNS(null, 'domkey') : null

const removeChildren = parent => {
  for (
    let lastChild = parent.lastChild;
    lastChild;
    lastChild = parent.lastChild
  ) {
    removeChild(parent, lastChild)
  }
}

const replaceNode = (oldNode, node) =>
  oldNode.parentNode.replaceChild(node, oldNode)

const appendChild = (parent, node) => parent.appendChild(node)

const insertBefore = (parent, node, position) =>
  parent.insertBefore(node, position)

const removeChild = (parent, node) => parent.removeChild(node)

const containsValue = (obj, value) =>
  obj != null && getOwnPropertyNames(obj).some(k => obj[k] === value)

const walkChildren = (node, callback) => {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    callback(c)
  }
}

const times = (n, callback) => {
  for (let i = 0; i < n; i += 1) {
    callback(i)
  }
}

export default sync
