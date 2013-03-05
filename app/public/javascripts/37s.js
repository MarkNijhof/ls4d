/*  WysiHat - WYSIWYG JavaScript framework, version 0.2.1
 *  (c) 2008-2010 Joshua Peek
 *
 *  WysiHat is freely distributable under the terms of an MIT-style license.
 *--------------------------------------------------------------------------*/


var WysiHat = {};

WysiHat.Editor = {
  attach: function(textarea) {
    var editArea;

    textarea = $(textarea);

    var id = textarea.id + '_editor';
    if (editArea = $(id)) return editArea;

    editArea = new Element('div', {
      'id': id,
      'class': 'editor',
      'contentEditable': 'true'
    });
    editArea.update(textarea.value.formatHTMLInput());

    Object.extend(editArea, WysiHat.Commands);

    textarea.insert({before: editArea});
    textarea.hide();

    return editArea;
  }
};
if (!window.getSelection) {
  var DOMUtils = {
    isDataNode: function(node) {
      try {
        return node && node.nodeValue !== null && node.data !== null;
      } catch (e) {
        return false;
      }
    },
    isAncestorOf: function(parent, node) {
      if (!parent) return false;
      return !DOMUtils.isDataNode(parent) &&
          (parent.contains(DOMUtils.isDataNode(node) ? node.parentNode : node) ||
          node.parentNode == parent);
    },
    isAncestorOrSelf: function(root, node) {
      return DOMUtils.isAncestorOf(root, node) || root == node;
    },
    findClosestAncestor: function(root, node) {
      if (DOMUtils.isAncestorOf(root, node))
        while (node && node.parentNode != root)
          node = node.parentNode;
      return node;
    },
    getNodeLength: function(node) {
      return DOMUtils.isDataNode(node) ? node.length : node.childNodes.length;
    },
    splitDataNode: function(node, offset) {
      if (!DOMUtils.isDataNode(node))
        return false;
      var newNode = node.cloneNode(false);
      node.deleteData(offset, node.length);
      newNode.deleteData(0, offset);
      node.parentNode.insertBefore(newNode, node.nextSibling);
    }
  };

  window.Range = (function() {
    function Range(document) {
      this._document = document;

      this.startContainer = this.endContainer = document.body;
      this.endOffset = DOMUtils.getNodeLength(document.body);
    }
    Range.START_TO_START = 0;
    Range.START_TO_END = 1;
    Range.END_TO_END = 2;
    Range.END_TO_START = 3;

    function findChildPosition(node) {
      for (var i = 0; node = node.previousSibling; i++)
        continue;
      return i;
    }

    Range.prototype = {
      startContainer: null,
      startOffset: 0,
      endContainer: null,
      endOffset: 0,
      commonAncestorContainer: null,
      collapsed: false,
      _document: null,

      _toTextRange: function() {
        function adoptEndPoint(textRange, domRange, bStart) {
          var container = domRange[bStart ? 'startContainer' : 'endContainer'];
          var offset = domRange[bStart ? 'startOffset' : 'endOffset'], textOffset = 0;
          var anchorNode = DOMUtils.isDataNode(container) ? container : container.childNodes[offset];
          var anchorParent = DOMUtils.isDataNode(container) ? container.parentNode : container;

          if (container.nodeType == 3 || container.nodeType == 4)
            textOffset = offset;

          var cursorNode = domRange._document.createElement('a');
          if (anchorNode)
            anchorParent.insertBefore(cursorNode, anchorNode);
          else
            anchorParent.appendChild(cursorNode);
          var cursor = domRange._document.body.createTextRange();
          cursor.moveToElementText(cursorNode);
          cursorNode.parentNode.removeChild(cursorNode);

          textRange.setEndPoint(bStart ? 'StartToStart' : 'EndToStart', cursor);
          textRange[bStart ? 'moveStart' : 'moveEnd']('character', textOffset);
        }

        var textRange = this._document.body.createTextRange();
        adoptEndPoint(textRange, this, true);
        adoptEndPoint(textRange, this, false);
        return textRange;
      },

      _refreshProperties: function() {
        this.collapsed = (this.startContainer == this.endContainer && this.startOffset == this.endOffset);
        var node = this.startContainer;
        while (node && node != this.endContainer && !DOMUtils.isAncestorOf(node, this.endContainer))
          node = node.parentNode;
        this.commonAncestorContainer = node;
      },

      setStart: function(container, offset) {
        this.startContainer = container;
        this.startOffset = offset;
        this._refreshProperties();
      },
      setEnd: function(container, offset) {
        this.endContainer = container;
        this.endOffset = offset;
        this._refreshProperties();
      },
      setStartBefore: function(refNode) {
        this.setStart(refNode.parentNode, findChildPosition(refNode));
      },
      setStartAfter: function(refNode) {
        this.setStart(refNode.parentNode, findChildPosition(refNode) + 1);
      },
      setEndBefore: function(refNode) {
        this.setEnd(refNode.parentNode, findChildPosition(refNode));
      },
      setEndAfter: function(refNode) {
        this.setEnd(refNode.parentNode, findChildPosition(refNode) + 1);
      },
      selectNode: function(refNode) {
        this.setStartBefore(refNode);
        this.setEndAfter(refNode);
      },
      selectNodeContents: function(refNode) {
        this.setStart(refNode, 0);
        this.setEnd(refNode, DOMUtils.getNodeLength(refNode));
      },
      collapse: function(toStart) {
        if (toStart)
          this.setEnd(this.startContainer, this.startOffset);
        else
          this.setStart(this.endContainer, this.endOffset);
      },

      cloneContents: function() {
        return (function cloneSubtree(iterator) {
          for (var node, frag = document.createDocumentFragment(); node = iterator.next(); ) {
            node = node.cloneNode(!iterator.hasPartialSubtree());
            if (iterator.hasPartialSubtree())
              node.appendChild(cloneSubtree(iterator.getSubtreeIterator()));
            frag.appendChild(node);
          }
          return frag;
        })(new RangeIterator(this));
      },
      extractContents: function() {
        var range = this.cloneRange();
        if (this.startContainer != this.commonAncestorContainer)
          this.setStartAfter(DOMUtils.findClosestAncestor(this.commonAncestorContainer, this.startContainer));
        this.collapse(true);
        return (function extractSubtree(iterator) {
          for (var node, frag = document.createDocumentFragment(); node = iterator.next(); ) {
            iterator.hasPartialSubtree() ? node = node.cloneNode(false) : iterator.remove();
            if (iterator.hasPartialSubtree())
              node.appendChild(extractSubtree(iterator.getSubtreeIterator()));
            frag.appendChild(node);
          }
          return frag;
        })(new RangeIterator(range));
      },
      deleteContents: function() {
        var range = this.cloneRange();
        if (this.startContainer != this.commonAncestorContainer)
          this.setStartAfter(DOMUtils.findClosestAncestor(this.commonAncestorContainer, this.startContainer));
        this.collapse(true);
        (function deleteSubtree(iterator) {
          while (iterator.next())
            iterator.hasPartialSubtree() ? deleteSubtree(iterator.getSubtreeIterator()) : iterator.remove();
        })(new RangeIterator(range));
      },
      insertNode: function(newNode) {
        if (DOMUtils.isDataNode(this.startContainer)) {
          DOMUtils.splitDataNode(this.startContainer, this.startOffset);
          this.startContainer.parentNode.insertBefore(newNode, this.startContainer.nextSibling);
        } else {
          var offsetNode = this.startContainer.childNodes[this.startOffset];
          if (offsetNode) {
            this.startContainer.insertBefore(newNode, offsetNode);
          } else {
            this.startContainer.appendChild(newNode);
          }
        }
        this.setStart(this.startContainer, this.startOffset);
      },
      surroundContents: function(newNode) {
        var content = this.extractContents();
        this.insertNode(newNode);
        newNode.appendChild(content);
        this.selectNode(newNode);
      },

      compareBoundaryPoints: function(how, sourceRange) {
        var containerA, offsetA, containerB, offsetB;
        switch (how) {
            case Range.START_TO_START:
            case Range.START_TO_END:
          containerA = this.startContainer;
          offsetA = this.startOffset;
          break;
            case Range.END_TO_END:
            case Range.END_TO_START:
          containerA = this.endContainer;
          offsetA = this.endOffset;
          break;
        }
        switch (how) {
            case Range.START_TO_START:
            case Range.END_TO_START:
          containerB = sourceRange.startContainer;
          offsetB = sourceRange.startOffset;
          break;
            case Range.START_TO_END:
            case Range.END_TO_END:
          containerB = sourceRange.endContainer;
          offsetB = sourceRange.endOffset;
          break;
        }

        return containerA.sourceIndex < containerB.sourceIndex ? -1 :
            containerA.sourceIndex == containerB.sourceIndex ?
                offsetA < offsetB ? -1 : offsetA == offsetB ? 0 : 1
                : 1;
      },
      cloneRange: function() {
        var range = new Range(this._document);
        range.setStart(this.startContainer, this.startOffset);
        range.setEnd(this.endContainer, this.endOffset);
        return range;
      },
      detach: function() {
      },
      toString: function() {
        return this._toTextRange().text;
      },
      createContextualFragment: function(tagString) {
        var content = (DOMUtils.isDataNode(this.startContainer) ? this.startContainer.parentNode : this.startContainer).cloneNode(false);
        content.innerHTML = tagString;
        for (var fragment = this._document.createDocumentFragment(); content.firstChild; )
          fragment.appendChild(content.firstChild);
        return fragment;
      }
    };

    function RangeIterator(range) {
      this.range = range;
      if (range.collapsed)
        return;

      var root = range.commonAncestorContainer;
      this._next = range.startContainer == root && !DOMUtils.isDataNode(range.startContainer) ?
          range.startContainer.childNodes[range.startOffset] :
          DOMUtils.findClosestAncestor(root, range.startContainer);
      this._end = range.endContainer == root && !DOMUtils.isDataNode(range.endContainer) ?
          range.endContainer.childNodes[range.endOffset] :
          DOMUtils.findClosestAncestor(root, range.endContainer).nextSibling;
    }

    RangeIterator.prototype = {
      range: null,
      _current: null,
      _next: null,
      _end: null,

      hasNext: function() {
        return !!this._next;
      },
      next: function() {
        var current = this._current = this._next;
        this._next = this._current && this._current.nextSibling != this._end ?
            this._current.nextSibling : null;

        if (DOMUtils.isDataNode(this._current)) {
          if (this.range.endContainer == this._current)
            (current = current.cloneNode(true)).deleteData(this.range.endOffset, current.length - this.range.endOffset);
          if (this.range.startContainer == this._current)
            (current = current.cloneNode(true)).deleteData(0, this.range.startOffset);
        }
        return current;
      },
      remove: function() {
        if (DOMUtils.isDataNode(this._current) &&
            (this.range.startContainer == this._current || this.range.endContainer == this._current)) {
          var start = this.range.startContainer == this._current ? this.range.startOffset : 0;
          var end = this.range.endContainer == this._current ? this.range.endOffset : this._current.length;
          this._current.deleteData(start, end - start);
        } else
          this._current.parentNode.removeChild(this._current);
      },
      hasPartialSubtree: function() {
        return !DOMUtils.isDataNode(this._current) &&
            (DOMUtils.isAncestorOrSelf(this._current, this.range.startContainer) ||
                DOMUtils.isAncestorOrSelf(this._current, this.range.endContainer));
      },
      getSubtreeIterator: function() {
        var subRange = new Range(this.range._document);
        subRange.selectNodeContents(this._current);
        if (DOMUtils.isAncestorOrSelf(this._current, this.range.startContainer))
          subRange.setStart(this.range.startContainer, this.range.startOffset);
        if (DOMUtils.isAncestorOrSelf(this._current, this.range.endContainer))
          subRange.setEnd(this.range.endContainer, this.range.endOffset);
        return new RangeIterator(subRange);
      }
    };

    return Range;
  })();

  window.Range._fromTextRange = function(textRange, document) {
    function adoptBoundary(domRange, textRange, bStart) {
      var cursorNode = document.createElement('a'), cursor = textRange.duplicate();
      cursor.collapse(bStart);
      var parent = cursor.parentElement();
      do {
        parent.insertBefore(cursorNode, cursorNode.previousSibling);
        cursor.moveToElementText(cursorNode);
      } while (cursor.compareEndPoints(bStart ? 'StartToStart' : 'StartToEnd', textRange) > 0 && cursorNode.previousSibling);

      if (cursor.compareEndPoints(bStart ? 'StartToStart' : 'StartToEnd', textRange) == -1 && cursorNode.nextSibling) {
        cursor.setEndPoint(bStart ? 'EndToStart' : 'EndToEnd', textRange);
        domRange[bStart ? 'setStart' : 'setEnd'](cursorNode.nextSibling, cursor.text.length);
      } else {
        domRange[bStart ? 'setStartBefore' : 'setEndBefore'](cursorNode);
      }
      cursorNode.parentNode.removeChild(cursorNode);
    }

    var domRange = new Range(document);
    adoptBoundary(domRange, textRange, true);
    adoptBoundary(domRange, textRange, false);
    return domRange;
  }

  document.createRange = function() {
    return new Range(document);
  };

  window.Selection = (function() {
    function Selection(document) {
      this._document = document;

      var selection = this;
      if (document.attachEvent) {
        document.attachEvent('onselectionchange', function() {
          selection._selectionChangeHandler();
        });
      }
    }

    Selection.prototype = {
      rangeCount: 0,
      _document: null,

      _selectionChangeHandler: function() {
        this.rangeCount = this._selectionExists(this._document.selection.createRange()) ? 1 : 0;
      },
      _selectionExists: function(textRange) {
        return textRange.compareEndPoints('StartToEnd', textRange) != 0 ||
            textRange.parentElement().isContentEditable;
      },
      addRange: function(range) {
        var selection = this._document.selection.createRange(), textRange = range._toTextRange();
        if (!this._selectionExists(selection)) {
          textRange.select();
        } else {
          if (textRange.compareEndPoints('StartToStart', selection) == -1)
            if (textRange.compareEndPoints('StartToEnd', selection) > -1 &&
                textRange.compareEndPoints('EndToEnd', selection) == -1)
              selection.setEndPoint('StartToStart', textRange);
          else
            if (textRange.compareEndPoints('EndToStart', selection) < 1 &&
                textRange.compareEndPoints('EndToEnd', selection) > -1)
              selection.setEndPoint('EndToEnd', textRange);
          selection.select();
        }
      },
      removeAllRanges: function() {
        this._document.selection.empty();
      },
      getRangeAt: function(index) {
        var textRange = this._document.selection.createRange();
        if (this._selectionExists(textRange))
          return Range._fromTextRange(textRange, this._document);
        return null;
      },
      toString: function() {
        return this._document.selection.createRange().text;
      }
    };

    return Selection;
  })();

  window.getSelection = (function() {
    var selection = new Selection(document);
    return function() { return selection; };
  })();
}

Object.extend(Range.prototype, (function() {
  function beforeRange(range) {
    if (!range || !range.compareBoundaryPoints) return false;
    return (this.compareBoundaryPoints(this.START_TO_START, range) == -1 &&
      this.compareBoundaryPoints(this.START_TO_END, range) == -1 &&
      this.compareBoundaryPoints(this.END_TO_END, range) == -1 &&
      this.compareBoundaryPoints(this.END_TO_START, range) == -1);
  }

  function afterRange(range) {
    if (!range || !range.compareBoundaryPoints) return false;
    return (this.compareBoundaryPoints(this.START_TO_START, range) == 1 &&
      this.compareBoundaryPoints(this.START_TO_END, range) == 1 &&
      this.compareBoundaryPoints(this.END_TO_END, range) == 1 &&
      this.compareBoundaryPoints(this.END_TO_START, range) == 1);
  }

  function betweenRange(range) {
    if (!range || !range.compareBoundaryPoints) return false;
    return !(this.beforeRange(range) || this.afterRange(range));
  }

  function equalRange(range) {
    if (!range || !range.compareBoundaryPoints) return false;
    return (this.compareBoundaryPoints(this.START_TO_START, range) == 0 &&
      this.compareBoundaryPoints(this.START_TO_END, range) == 1 &&
      this.compareBoundaryPoints(this.END_TO_END, range) == 0 &&
      this.compareBoundaryPoints(this.END_TO_START, range) == -1);
  }

  function getNode() {
    var parent = this.commonAncestorContainer;

    while (parent.nodeType == Node.TEXT_NODE)
      parent = parent.parentNode;

    var child = parent.childElements().detect(function(child) {
      var range = document.createRange();
      range.selectNodeContents(child);
      return this.betweenRange(range);
    }.bind(this));

    return $(child || parent);
  }

  return {
    beforeRange:  beforeRange,
    afterRange:   afterRange,
    betweenRange: betweenRange,
    equalRange:   equalRange,
    getNode:      getNode
  };
})());

if (Prototype.Browser.IE) {
  Object.extend(Selection.prototype, (function() {
    function getNode() {
      var range = this._document.selection.createRange();
      return $(range.parentElement());
    }

    function selectNode(element) {
      var range = this._document.body.createTextRange();
      range.moveToElementText(element);
      range.select();
    }

    return {
      getNode:    getNode,
      selectNode: selectNode
    }
  })());
} else {
  if (typeof Selection == 'undefined') {
    var Selection = {}
    Selection.prototype = window.getSelection().__proto__;
  }

  Object.extend(Selection.prototype, (function() {
    function getNode() {
      if (this.rangeCount > 0)
        return this.getRangeAt(0).getNode();
      else
        return null;
    }

    function selectNode(element) {
      var range = document.createRange();
      range.selectNode(element);
      this.removeAllRanges();
      this.addRange(range);
    }

    return {
      getNode:    getNode,
      selectNode: selectNode
    }
  })());
}
document.observe("dom:loaded", function() {
  function fieldChangeHandler(event) {
    var element = event.findElement('input,textarea,*[contenteditable=""],*[contenteditable=true]');
    if (element) {
      var value;

      if (element.contentEditable == 'true')
        value = element.innerHTML;
      else if (element.getValue)
        value = element.getValue();

      if (value && element.previousValue != value) {
        element.fire("field:change");
        element.previousValue = value;
      }
    }
  }

  $(document.body).observe("keyup", fieldChangeHandler);
});

var $E = WysiHat.Commands = (function(window) {
  function boldSelection() {
    this.execCommand('bold', false, null);
  }

  function boldSelected() {
    return this.queryCommandState('bold');
  }

  function underlineSelection() {
    this.execCommand('underline', false, null);
  }

  function underlineSelected() {
    return this.queryCommandState('underline');
  }

  function italicSelection() {
    this.execCommand('italic', false, null);
  }

  function italicSelected() {
    return this.queryCommandState('italic');
  }

  function strikethroughSelection() {
    this.execCommand('strikethrough', false, null);
  }

  function blockquoteSelection() {
    this.execCommand('blockquote', false, null);
  }

  function fontSelection(font) {
    this.execCommand('fontname', false, font);
  }

  function fontSizeSelection(fontSize) {
    this.execCommand('fontsize', false, fontSize);
  }

  function colorSelection(color) {
    this.execCommand('forecolor', false, color);
  }

  function backgroundColorSelection(color) {
    if(Prototype.Browser.Gecko) {
      this.execCommand('hilitecolor', false, color);
    } else {
      this.execCommand('backcolor', false, color);
    }
  }

  function alignSelection(alignment) {
    this.execCommand('justify' + alignment);
  }

  function alignSelected() {
    var node = window.getSelection().getNode();
    return Element.getStyle(node, 'textAlign');
  }

  function linkSelection(url) {
    this.execCommand('createLink', false, url);
  }

  function unlinkSelection() {
    var node = window.getSelection().getNode();
    if (this.linkSelected())
      window.getSelection().selectNode(node);

    this.execCommand('unlink', false, null);
  }

  function linkSelected() {
    var node = window.getSelection().getNode();
    return node ? node.tagName.toUpperCase() == 'A' : false;
  }

  function formatblockSelection(element){
    this.execCommand('formatblock', false, element);
  }

  function toggleOrderedList() {
    this.execCommand('insertorderedlist', false, null);
  }

  function insertOrderedList() {
    this.toggleOrderedList();
  }

  function orderedListSelected() {
    var element = window.getSelection().getNode();
    if (element) return element.match('*[contenteditable=""] ol, *[contenteditable=true] ol, *[contenteditable=""] ol *, *[contenteditable=true] ol *');
    return false;
  }

  function toggleUnorderedList() {
    this.execCommand('insertunorderedlist', false, null);
  }

  function insertUnorderedList() {
    this.toggleUnorderedList();
  }

  function unorderedListSelected() {
    var element = window.getSelection().getNode();
    if (element) return element.match('*[contenteditable=""] ul, *[contenteditable=true] ul, *[contenteditable=""] ul *, *[contenteditable=true] ul *');
    return false;
  }

  function insertImage(url) {
    this.execCommand('insertImage', false, url);
  }

  function insertHTML(html) {
    if (Prototype.Browser.IE) {
      var range = window.document.selection.createRange();
      range.pasteHTML(html);
      range.collapse(false);
      range.select();
    } else {
      this.execCommand('insertHTML', false, html);
    }
  }

  function execCommand(command, ui, value) {
    var handler = this.commands.get(command);
    if (handler) {
      handler.bind(this)(value);
    } else {
      try {
        window.document.execCommand(command, ui, value);
      } catch(e) { return null; }
    }

    document.activeElement.fire("field:change");
  }

  function queryCommandState(state) {
    var handler = this.queryCommands.get(state);
    if (handler) {
      return handler.bind(this)();
    } else {
      try {
        return window.document.queryCommandState(state);
      } catch(e) { return null; }
    }
  }

  function getSelectedStyles() {
    var styles = $H({});
    var editor = this;
    editor.styleSelectors.each(function(style){
      var node = editor.selection.getNode();
      styles.set(style.first(), Element.getStyle(node, style.last()));
    });
    return styles;
  }

  return {
     boldSelection:            boldSelection,
     boldSelected:             boldSelected,
     underlineSelection:       underlineSelection,
     underlineSelected:        underlineSelected,
     italicSelection:          italicSelection,
     italicSelected:           italicSelected,
     strikethroughSelection:   strikethroughSelection,
     blockquoteSelection:      blockquoteSelection,
     fontSelection:            fontSelection,
     fontSizeSelection:        fontSizeSelection,
     colorSelection:           colorSelection,
     backgroundColorSelection: backgroundColorSelection,
     alignSelection:           alignSelection,
     alignSelected:            alignSelected,
     linkSelection:            linkSelection,
     unlinkSelection:          unlinkSelection,
     linkSelected:             linkSelected,
     formatblockSelection:     formatblockSelection,
     toggleOrderedList:        toggleOrderedList,
     insertOrderedList:        insertOrderedList,
     orderedListSelected:      orderedListSelected,
     toggleUnorderedList:      toggleUnorderedList,
     insertUnorderedList:      insertUnorderedList,
     unorderedListSelected:    unorderedListSelected,
     insertImage:              insertImage,
     insertHTML:               insertHTML,
     execCommand:              execCommand,
     queryCommandState:        queryCommandState,
     getSelectedStyles:        getSelectedStyles,

    commands: $H({}),

    queryCommands: $H({
      link:          linkSelected,
      orderedlist:   orderedListSelected,
      unorderedlist: unorderedListSelected
    }),

    styleSelectors: $H({
      fontname:    'fontFamily',
      fontsize:    'fontSize',
      forecolor:   'color',
      hilitecolor: 'backgroundColor',
      backcolor:   'backgroundColor'
    })
  };
})(window);


if (Prototype.Browser.IE) {
  Object.extend(Selection.prototype, (function() {
    function setBookmark() {
      var bookmark = $('bookmark');
      if (bookmark) bookmark.remove();

      bookmark = new Element('span', { 'id': 'bookmark' }).update("&nbsp;");
      var parent = new Element('div');
      parent.appendChild(bookmark);

      var range = this._document.selection.createRange();
      range.collapse();
      range.pasteHTML(parent.innerHTML);
    }

    function moveToBookmark() {
      var bookmark = $('bookmark');
      if (!bookmark) return;

      var range = this._document.selection.createRange();
      range.moveToElementText(bookmark);
      range.collapse();
      range.select();

      bookmark.remove();
    }

    return {
      setBookmark:    setBookmark,
      moveToBookmark: moveToBookmark
    }
  })());
} else {
  Object.extend(Selection.prototype, (function() {
    function setBookmark() {
      var bookmark = $('bookmark');
      if (bookmark) bookmark.remove();

      bookmark = new Element('span', { 'id': 'bookmark' }).update("&nbsp;");
      this.getRangeAt(0).insertNode(bookmark);
    }

    function moveToBookmark() {
      var bookmark = $('bookmark');
      if (!bookmark) return;

      var range = document.createRange();
      range.setStartBefore(bookmark);
      this.removeAllRanges();
      this.addRange(range);

      bookmark.remove();
    }

    return {
      setBookmark:    setBookmark,
      moveToBookmark: moveToBookmark
    }
  })());
}

(function() {
  function cloneWithAllowedAttributes(element, allowedAttributes) {
    var result = new Element(element.tagName), length = allowedAttributes.length, i;
    element = $(element);

    for (i = 0; i < allowedAttributes.length; i++) {
      attribute = allowedAttributes[i];
      if (element.hasAttribute(attribute)) {
        result.writeAttribute(attribute, element.readAttribute(attribute));
      }
    }

    return result;
  }

  function withEachChildNodeOf(element, callback) {
    var nodes = $A(element.childNodes), length = nodes.length, i;
    for (i = 0; i < length; i++) callback(nodes[i]);
  }

  function sanitizeNode(node, tagsToRemove, tagsToAllow) {
    var parentNode = node.parentNode;

    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        var tagName = node.tagName.toLowerCase();

        if (tagName in tagsToAllow) {
          var newNode = cloneWithAllowedAttributes(node, tagsToAllow[tagName]);
          withEachChildNodeOf(node, function(childNode) {
            newNode.appendChild(childNode);
            sanitizeNode(childNode, tagsToRemove, tagsToAllow);
          });
          parentNode.insertBefore(newNode, node);

        } else if (!(tagName in tagsToRemove)) {
          withEachChildNodeOf(node, function(childNode) {
            parentNode.insertBefore(childNode, node);
            sanitizeNode(childNode, tagsToRemove, tagsToAllow);
          });
        }

      case Node.COMMENT_NODE:
        parentNode.removeChild(node);
    }
  }

  Element.addMethods({
    sanitizeContents: function(element, options) {
      element = $(element);

      var tagsToRemove = {};
      (options.remove || "").split(",").each(function(tagName) {
        tagsToRemove[tagName.strip()] = true;
      });

      var tagsToAllow = {};
      (options.allow || "").split(",").each(function(selector) {
        var parts = selector.strip().split(/[\[\]]/);
        var tagName = parts[0], allowedAttributes = parts.slice(1).grep(/./);
        tagsToAllow[tagName] = allowedAttributes;
      });

      withEachChildNodeOf(element, function(childNode) {
        sanitizeNode(childNode, tagsToRemove, tagsToAllow);
      });

      return element;
    }
  });
})();

document.observe("dom:loaded", function() {
  if ('onselectionchange' in document) {
    var selectionChangeHandler = function() {
      if (!document.selection) {
        return
      }
      var range   = document.selection.createRange();
      var element = range.parentElement();
      $(element).fire("selection:change");
    }

    document.observe("selectionchange", selectionChangeHandler);
  } else {
    var previousRange;

    var selectionChangeHandler = function() {
      var element        = document.activeElement;
      var elementTagName = element.tagName.toLowerCase();

      if (elementTagName == "textarea" || elementTagName == "input") {
        previousRange = null;
        $(element).fire("selection:change");
      } else {
        var selection = window.getSelection();
        if (selection.rangeCount < 1) return;

        var range = selection.getRangeAt(0);
        if (range && range.equalRange(previousRange)) return;
        previousRange = range;

        element = range.commonAncestorContainer;
        while (element.nodeType == Node.TEXT_NODE)
          element = element.parentNode;

        $(element).fire("selection:change");
      }
    };

    document.observe("mouseup", selectionChangeHandler);
    document.observe("keyup", selectionChangeHandler);
  }
});

WysiHat.Formatting = (function() {
  var ACCUMULATING_LINE      = {};
  var EXPECTING_LIST_ITEM    = {};
  var ACCUMULATING_LIST_ITEM = {};

  return {
    getBrowserMarkupFrom: function(applicationMarkup) {
      var container = new Element("div").update(applicationMarkup);

      function spanify(element, style) {
        element.replace(
          '<span style="' + style +
          '" class="Apple-style-span">' +
          element.innerHTML + '</span>'
        );
      }

      function convertStrongsToSpans() {
        container.select("strong").each(function(element) {
          spanify(element, "font-weight: bold");
        });
      }

      function convertEmsToSpans() {
        container.select("em").each(function(element) {
          spanify(element, "font-style: italic");
        });
      }

      function convertDivsToParagraphs() {
        container.select("div").each(function(element) {
          element.replace("<p>" + element.innerHTML + "</p>");
        });
      }

      if (Prototype.Browser.WebKit || Prototype.Browser.Gecko) {
        convertStrongsToSpans();
        convertEmsToSpans();
      } else if (Prototype.Browser.IE || Prototype.Browser.Opera) {
        convertDivsToParagraphs();
      }

      return container.innerHTML;
    },

    getApplicationMarkupFrom: function(element) {
      var mode = ACCUMULATING_LINE, result, container, line, lineContainer, previousAccumulation;

      function walk(nodes) {
        var length = nodes.length, node, tagName, i;

        for (i = 0; i < length; i++) {
          node = nodes[i];

          if (node.nodeType == Node.ELEMENT_NODE) {
            tagName = node.tagName.toLowerCase();
            open(tagName, node);
            walk(node.childNodes);
            close(tagName);

          } else if (node.nodeType == Node.TEXT_NODE) {
            read(node.nodeValue);
          }
        }
      }

      function open(tagName, node) {
        if (mode == ACCUMULATING_LINE) {
          if (isBlockElement(tagName)) {
            if (isEmptyParagraph(node)) {
              accumulate(new Element("br"));
            }

            flush();

            if (isListElement(tagName)) {
              container = insertList(tagName);
              mode = EXPECTING_LIST_ITEM;
            }

          } else if (isLineBreak(tagName)) {
            if (isLineBreak(getPreviouslyAccumulatedTagName())) {
              previousAccumulation.parentNode.removeChild(previousAccumulation);
              flush();
            }

            accumulate(node.cloneNode(false));

            if (!previousAccumulation.previousNode) flush();

          } else {
            accumulateInlineElement(tagName, node);
          }

        } else if (mode == EXPECTING_LIST_ITEM) {
          if (isListItemElement(tagName)) {
            mode = ACCUMULATING_LIST_ITEM;
          }

        } else if (mode == ACCUMULATING_LIST_ITEM) {
          if (isLineBreak(tagName)) {
            accumulate(node.cloneNode(false));

          } else if (!isBlockElement(tagName)) {
            accumulateInlineElement(tagName, node);
          }
        }
      }

      function close(tagName) {
        if (mode == ACCUMULATING_LINE) {
          if (isLineElement(tagName)) {
            flush();
          }

          if (line != lineContainer) {
            lineContainer = lineContainer.parentNode;
          }

        } else if (mode == EXPECTING_LIST_ITEM) {
          if (isListElement(tagName)) {
            container = result;
            mode = ACCUMULATING_LINE;
          }

        } else if (mode == ACCUMULATING_LIST_ITEM) {
          if (isListItemElement(tagName)) {
            flush();
            mode = EXPECTING_LIST_ITEM;
          }

          if (line != lineContainer) {
            lineContainer = lineContainer.parentNode;
          }
        }
      }

      function isBlockElement(tagName) {
        return isLineElement(tagName) || isListElement(tagName);
      }

      function isLineElement(tagName) {
        return tagName == "p" || tagName == "div";
      }

      function isListElement(tagName) {
        return tagName == "ol" || tagName == "ul";
      }

      function isListItemElement(tagName) {
        return tagName == "li";
      }

      function isLineBreak(tagName) {
        return tagName == "br";
      }

      function isEmptyParagraph(node) {
        return node.tagName.toLowerCase() == "p" && node.childNodes.length == 0;
      }

      function read(value) {
        accumulate(document.createTextNode(value));
      }

      function accumulateInlineElement(tagName, node) {
        var element = node.cloneNode(false);

        if (tagName == "span") {
          if ($(node).getStyle("fontWeight") == "bold") {
            element = new Element("strong");

          } else if ($(node).getStyle("fontStyle") == "italic") {
            element = new Element("em");
          }
        }

        accumulate(element);
        lineContainer = element;
      }

      function accumulate(node) {
        if (mode != EXPECTING_LIST_ITEM) {
          if (!line) line = lineContainer = createLine();
          previousAccumulation = node;
          lineContainer.appendChild(node);
        }
      }

      function getPreviouslyAccumulatedTagName() {
        if (previousAccumulation && previousAccumulation.nodeType == Node.ELEMENT_NODE) {
          return previousAccumulation.tagName.toLowerCase();
        }
      }

      function flush() {
        if (line && line.childNodes.length) {
          container.appendChild(line);
          line = lineContainer = null;
        }
      }

      function createLine() {
        if (mode == ACCUMULATING_LINE) {
          return new Element("div");
        } else if (mode == ACCUMULATING_LIST_ITEM) {
          return new Element("li");
        }
      }

      function insertList(tagName) {
        var list = new Element(tagName);
        result.appendChild(list);
        return list;
      }

      result = container = new Element("div");
      walk(element.childNodes);
      flush();
      return result.innerHTML;
    }
  };
})();

Object.extend(String.prototype, (function() {
  function formatHTMLOutput() {
    var text = String(this);
    text = text.tidyXHTML();

    if (Prototype.Browser.WebKit) {
      text = text.replace(/(<div>)+/g, "\n");
      text = text.replace(/(<\/div>)+/g, "");

      text = text.replace(/<p>\s*<\/p>/g, "");

      text = text.replace(/<br \/>(\n)*/g, "\n");
    } else if (Prototype.Browser.Gecko) {
      text = text.replace(/<p>/g, "");
      text = text.replace(/<\/p>(\n)?/g, "\n");

      text = text.replace(/<br \/>(\n)*/g, "\n");
    } else if (Prototype.Browser.IE || Prototype.Browser.Opera) {
      text = text.replace(/<p>(&nbsp;|&#160;|\s)<\/p>/g, "<p></p>");

      text = text.gsub(/<(ol|ul)>\n+/, "<#{1}>");
      text = text.replace(/<\/li>\n+/, "</li>");

      text = text.replace(/<br \/>/g, "");

      text = text.replace(/<p>/g, '');

      text = text.replace(/&nbsp;/g, '');

      text = text.replace(/<\/p>(\n)?/g, "\n");

      text = text.gsub(/^<p>/, '');
      text = text.gsub(/<\/p>$/, '');
    }

    text = text.gsub(/<b>/, "<strong>");
    text = text.gsub(/<\/b>/, "</strong>");

    text = text.gsub(/<i>/, "<em>");
    text = text.gsub(/<\/i>/, "</em>");

    text = text.gsub(/<\/(ol|ul)>/, "</#{1}>\n\n");


    text = text.replace(/\n\n+/g, "</p>\n\n<p>");

    text = text.gsub(/(([^\n])(\n))(?=([^\n]))/, "#{2}<br />\n");

    text = '<p>' + text + '</p>';

    text = text.replace(/<p>\s*/g, "<p>");
    text = text.replace(/\s*<\/p>/g, "</p>");

    var element = Element("body");
    element.innerHTML = text;

    if (Prototype.Browser.WebKit || Prototype.Browser.Gecko) {
      var replaced;
      do {
        replaced = false;
        element.select('span').each(function(span) {
          if (span.hasClassName('Apple-style-span')) {
            span.removeClassName('Apple-style-span');
            if (span.className == '')
              span.removeAttribute('class');
            replaced = true;
          } else if (span.getStyle('fontWeight') == 'bold') {
            span.setStyle({fontWeight: ''});
            if (span.style.length == 0)
              span.removeAttribute('style');
            span.update('<strong>' + span.innerHTML + '</strong>');
            replaced = true;
          } else if (span.getStyle('fontStyle') == 'italic') {
            span.setStyle({fontStyle: ''});
            if (span.style.length == 0)
              span.removeAttribute('style');
            span.update('<em>' + span.innerHTML + '</em>');
            replaced = true;
          } else if (span.getStyle('textDecoration') == 'underline') {
            span.setStyle({textDecoration: ''});
            if (span.style.length == 0)
              span.removeAttribute('style');
            span.update('<u>' + span.innerHTML + '</u>');
            replaced = true;
          } else if (span.attributes.length == 0) {
            span.replace(span.innerHTML);
            replaced = true;
          }
        });
      } while (replaced);
    }

    var acceptableBlankTags = $A(['BR', 'IMG']);

    for (var i = 0; i < element.descendants().length; i++) {
      var node = element.descendants()[i];
      if (node.innerHTML.blank() && !acceptableBlankTags.include(node.nodeName) && node.id != 'bookmark')
        node.remove();
    }

    text = element.innerHTML;
    text = text.tidyXHTML();

    text = text.replace(/<br \/>(\n)*/g, "<br />\n");
    text = text.replace(/<\/p>\n<p>/g, "</p>\n\n<p>");

    text = text.replace(/<p>\s*<\/p>/g, "");

    text = text.replace(/\s*$/g, "");

    return text;
  }

  function formatHTMLInput() {
    var text = String(this);

    var element = Element("body");
    element.innerHTML = text;

    if (Prototype.Browser.Gecko || Prototype.Browser.WebKit) {
      element.select('strong').each(function(element) {
        element.replace('<span style="font-weight: bold;">' + element.innerHTML + '</span>');
      });
      element.select('em').each(function(element) {
        element.replace('<span style="font-style: italic;">' + element.innerHTML + '</span>');
      });
      element.select('u').each(function(element) {
        element.replace('<span style="text-decoration: underline;">' + element.innerHTML + '</span>');
      });
    }

    if (Prototype.Browser.WebKit)
      element.select('span').each(function(span) {
        if (span.getStyle('fontWeight') == 'bold')
          span.addClassName('Apple-style-span');

        if (span.getStyle('fontStyle') == 'italic')
          span.addClassName('Apple-style-span');

        if (span.getStyle('textDecoration') == 'underline')
          span.addClassName('Apple-style-span');
      });

    text = element.innerHTML;
    text = text.tidyXHTML();

    text = text.replace(/<\/p>(\n)*<p>/g, "\n\n");

    text = text.replace(/(\n)?<br( \/)?>(\n)?/g, "\n");

    text = text.replace(/^<p>/g, '');
    text = text.replace(/<\/p>$/g, '');

    if (Prototype.Browser.Gecko) {
      text = text.replace(/\n/g, "<br>");
      text = text + '<br>';
    } else if (Prototype.Browser.WebKit) {
      text = text.replace(/\n/g, "</div><div>");
      text = '<div>' + text + '</div>';
      text = text.replace(/<div><\/div>/g, "<div><br></div>");
    } else if (Prototype.Browser.IE || Prototype.Browser.Opera) {
      text = text.replace(/\n/g, "</p>\n<p>");
      text = '<p>' + text + '</p>';
      text = text.replace(/<p><\/p>/g, "<p>&nbsp;</p>");
      text = text.replace(/(<p>&nbsp;<\/p>)+$/g, "");
    }

    return text;
  }

  function tidyXHTML() {
    var text = String(this);

    text = text.gsub(/\r\n?/, "\n");

    text = text.gsub(/<([A-Z]+)([^>]*)>/, function(match) {
      return '<' + match[1].toLowerCase() + match[2] + '>';
    });

    text = text.gsub(/<\/([A-Z]+)>/, function(match) {
      return '</' + match[1].toLowerCase() + '>';
    });

    text = text.replace(/<br>/g, "<br />");

    return text;
  }

  return {
    formatHTMLOutput: formatHTMLOutput,
    formatHTMLInput:  formatHTMLInput,
    tidyXHTML:        tidyXHTML
  };
})());
Object.extend(String.prototype, {
  sanitize: function(options) {
    return Element("div").update(this).sanitize(options).innerHTML.tidyXHTML();
  }
});

Element.addMethods({
  sanitize: function(element, options) {
    element = $(element);
    options = $H(options);
    var allowed_tags = $A(options.get('tags') || []);
    var allowed_attributes = $A(options.get('attributes') || []);
    var sanitized = Element(element.nodeName);

    $A(element.childNodes).each(function(child) {
      if (child.nodeType == 1) {
        var children = $(child).sanitize(options).childNodes;

        if (allowed_tags.include(child.nodeName.toLowerCase())) {
          var new_child = Element(child.nodeName);
          allowed_attributes.each(function(attribute) {
            if ((value = child.readAttribute(attribute)))
              new_child.writeAttribute(attribute, value);
          });
          sanitized.appendChild(new_child);

          $A(children).each(function(grandchild) { new_child.appendChild(grandchild); });
        } else {
          $A(children).each(function(grandchild) { sanitized.appendChild(grandchild); });
        }
      } else if (child.nodeType == 3) {
        sanitized.appendChild(child);
      }
    });
    return sanitized;
  }
});


WysiHat.Toolbar = Class.create((function() {
  function initialize(editor) {
    this.editor = editor;
    this.element = this.createToolbarElement();
  }

  function createToolbarElement() {
    var toolbar = new Element('div', { 'class': 'editor_toolbar' });
    this.editor.insert({before: toolbar});
    return toolbar;
  }

  function addButtonSet(set) {
    $A(set).each(function(button){
      this.addButton(button);
    }.bind(this));
  }

  function addButton(options, handler) {
    options = $H(options);

    if (!options.get('name'))
      options.set('name', options.get('label').toLowerCase());
    var name = options.get('name');

    var button = this.createButtonElement(this.element, options);

    var handler = this.buttonHandler(name, options);
    this.observeButtonClick(button, handler);

    var handler = this.buttonStateHandler(name, options);
    this.observeStateChanges(button, name, handler);
  }

  function createButtonElement(toolbar, options) {
    var button = new Element('a', {
      'class': 'button', 'href': '#'
    });
    button.update('<span>' + options.get('label') + '</span>');
    button.addClassName(options.get('name'));

    toolbar.appendChild(button);

    return button;
  }

  function buttonHandler(name, options) {
    if (options.handler)
      return options.handler;
    else if (options.get('handler'))
      return options.get('handler');
    else
      return function(editor) { editor.execCommand(name); };
  }

  function observeButtonClick(element, handler) {
    element.observe('click', function(event) {
      handler(this.editor);
      event.stop();
    }.bind(this));
  }

  function buttonStateHandler(name, options) {
    if (options.query)
      return options.query;
    else if (options.get('query'))
      return options.get('query');
    else
      return function(editor) { return editor.queryCommandState(name); };
  }

  function observeStateChanges(element, name, handler) {
    var previousState;
    this.editor.observe("selection:change", function(event) {
      var state = handler(this.editor);
      if (state != previousState) {
        previousState = state;
        this.updateButtonState(element, name, state);
      }
    }.bind(this));
  }

  function updateButtonState(element, name, state) {
    if (state)
      element.addClassName('selected');
    else
      element.removeClassName('selected');
  }

  return {
    initialize:           initialize,
    createToolbarElement: createToolbarElement,
    addButtonSet:         addButtonSet,
    addButton:            addButton,
    createButtonElement:  createButtonElement,
    buttonHandler:        buttonHandler,
    observeButtonClick:   observeButtonClick,
    buttonStateHandler:   buttonStateHandler,
    observeStateChanges:  observeStateChanges,
    updateButtonState:    updateButtonState
  };
})());

WysiHat.Toolbar.ButtonSets = {};

WysiHat.Toolbar.ButtonSets.Basic = $A([
  { label: "Bold" },
  { label: "Underline" },
  { label: "Italic" }
]);
Element.addMethods({
  trace: function(element, expression) {
    element = $(element);
    if (element.match(expression)) return element;
    return element.up(expression);
  }
});

var MenuObserver = Class.create({
  initialize: function(region, options) {
    this.region  = $(region);
    this.options = options;
    this.registerObservers();
    this.start();
  },

  registerObservers: function() {
    document.observe("mousedown", this.onDocumentMouseDown.bind(this));
    this.region.observe("mousedown", this.onRegionMouseDown.bind(this));
    this.region.observe("mouseup", this.onRegionMouseUp.bind(this));
    this.region.observe("mouseover", this.onRegionMouseOver.bind(this));
    this.region.observe("mouseout", this.onRegionMouseOut.bind(this));
    this.region.observe("keydown", this.onRegionKeyDown.bind(this));
    this.region.observe("menu:deactivate", this.deactivate.bind(this));
  },

  start: function() {
    this.started = true;
  },

  stop: function() {
    this.started = false;
  },

  onDocumentMouseDown: function(event) {
    if (!this.started || !this.activeContainer) return;

    var element = event.findElement();
    if (!this.elementBelongsToActiveContainer(element)) {
      this.deactivate();
    }
  },

  onRegionMouseDown: function(event) {
    if (!this.started) return;

    var element = event.findElement();
    if (!this.elementBelongsToActiveContainer(element)) {
      this.deactivate();
    }

    var target = this.findTargetForElement(element);
    if (target) {
      var container = this.findContainerForElement(target);
      if (container == this.activeContainer) {
        this.deactivate();
      } else {
        this.activate(container);
      }
      event.stop();
    }
  },

  onRegionMouseUp: function(event) {
    if (!this.started || !this.activeContainer || this.isIgnorable(event)) return;

    var element = event.findElement();
    if (this.elementBelongsToActiveContainer(element)) {
      var action = this.findActionForElement(element);
      if (action) {
        this.select(action);
        this.deactivate();
        event.stop();
      } else if (this.findProvisionForElement(element)) {
        event.stop();
      }
    }
  },

  onRegionMouseOver: function(event) {
    var element = event.findElement("[data-menuaction]");
    if (element) element.addClassName("hover");
  },

  onRegionMouseOut: function(event) {
    var element = event.findElement("[data-menuaction]");
    if (element) element.removeClassName("hover");
  },

  onRegionKeyDown: function(event) {
    if (!this.started) return;

    if (event.keyCode == Event.KEY_ESC) {
      this.deactivate();
      event.stop();
    }
  },

  activate: function(container) {
    if (container) {
      var event = container.fire("menu:prepared", {
        container: this.activeContainer
      });

      if (!event.stopped) {
        this.finishDeactivation();
        this.activeContainer = container;
        this.activeContainer.addClassName("active_menu");
        this.activeContainer.fire("menu:activated");
      }
    }
  },

  deactivate: function() {
    if (this.activeContainer) {
      var container = this.activeContainer;
      var content = container.down('.menu_content');
      this.activeContainer = false;

      this.deactivation = {
        container: container,
        content:   content,
        effect:    new Effect.Fade(content, {
          duration: 0.2,
          afterFinish: this.finishDeactivation.bind(this)
        })
      };
    }
  },

  finishDeactivation: function() {
    if (this.deactivation) {
      this.deactivation.effect.cancel();
      this.deactivation.container.removeClassName("active_menu");
      this.deactivation.container.down('.menu_content').setStyle({opacity: ''});

      this.deactivation.content.show();
      this.deactivation.container.fire("menu:deactivated");
      this.deactivation = false;
    }
  },

  select: function(action) {
    if (this.activeContainer) {
      var actionName  = action.readAttribute("data-menuaction");
      var actionValue = action.readAttribute("data-menuvalue");

      action.fire("menu:selected", {
        container: this.activeContainer,
        action:    actionName,
        value:     actionValue
      });
    }
  },

  isIgnorable: function(event) {
    return event.button > 1 || event.ctrlKey || event.metaKey;
  },

  elementBelongsToActiveContainer: function(element) {
    if (this.activeContainer) {
      return this.findContainerForElement(element) == this.activeContainer;
    }
  },

  elementsBelongToSameContainer: function(first, second) {
    var firstContainer  = this.findContainerForElement(first);
    var secondContainer = this.findContainerForElement(second);
    return firstContainer == secondContainer;
  },

  findTargetForElement: function(element) {
    var target = element.trace(".menu_target");
    if (this.elementsBelongToSameContainer(element, target)) return target;
  },

  findActionForElement: function(element) {
    var action = element.trace("[data-menuaction]");
    if (this.elementsBelongToSameContainer(element, action)) return action;
  },

  findProvisionForElement: function(element) {
    var provision = element.trace(".menu_target, .menu_content, [data-menuaction]");
    if (this.elementsBelongToSameContainer(element, provision)) return provision;
  },

  findContainerForElement: function(element) {
    if (element) return element.trace(".menu_container");
  }
});
(function() {
  var queue = $A([]);
  function checkQueue() {
    if (queue.any())
      queue.pop().fire("dom:modified");
  }

  var notify;
  function deferFire(element) {
    if (!queue.include(element))
      queue.push(element);

    if (notify)
      window.clearTimeout(notify);
    notify = checkQueue.defer();
  }

  function fireModifiedEvent() {
    var args = $A(arguments), proceed = args.shift(), parent = $(args.first()).up();
    var element = proceed.apply(this, args);

    if (Object.isElement(element) && element.up("html")) {
      deferFire(element);
    } else if (Object.isElement(parent) && parent.up("html")) {
      deferFire(parent);
    }

    return element;
  }

  Element.addMethods({
    insert: Element.Methods.insert.wrap(fireModifiedEvent),
    replace: Element.Methods.replace.wrap(fireModifiedEvent),
    update: Element.Methods.update.wrap(fireModifiedEvent)
  });

  document.observe("dom:loaded", function() {
    Event.fire.defer(document.body, "dom:modified")
  });
})();
(function() {
  var focusInHandler = function(e) { e.findElement().fire("focus:in") };
  var focusOutHandler = function(e) { e.findElement().fire("focus:out") };

  if (document.addEventListener) {
    document.addEventListener("focus", focusInHandler, true);
    document.addEventListener("blur", focusOutHandler, true);
  } else {
    document.observe("focusin", focusInHandler);
    document.observe("focusout", focusOutHandler);
  }
})();

(function() {
  if (document.selection) {
    Object.extend(Selection.prototype, {
      makeInactiveSelection: function() {
        var range = this._document.selection.createRange();

        var dummy   = new Element('div');
        var wrapper = new Element('span', {'class': 'inactive_selection'}).update(range.htmlText);
        dummy.appendChild(wrapper);
        range.pasteHTML(dummy.innerHTML);
      },

      restoreInactiveSelection: function(element) {
        var range = this._document.selection.createRange();
        range.moveToElementText(element);
        element.removeClassName("inactive_selection");
        range.select();
      }
    });
  } else {
    Object.extend(Selection.prototype, {
      makeInactiveSelection: function() {
        var range   = this.getRangeAt(0);
        var wrapper = new Element('span', {'class': "inactive_selection"});
        range.surroundContents(wrapper);
      },

      restoreInactiveSelection: function(element) {
        var range = document.createRange();
        range.selectNodeContents(element);
        element.removeClassName("inactive_selection");
        this.removeAllRanges();
        this.addRange(range);
      }
    });
  }

  document.observe("focus:in", function(event) {
    var element = event.findElement("div[contentEditable=true]");
    if (element) {
      element.select("span.inactive_selection").each(function(element) {
        element.removeClassName("inactive_selection");
      });
    }
  });
})();

var RichTextArea = Class.create({
  initialize: function(editor) {
    this.editor = $(editor);
    this.element = this.editor.up("div.rich_text_area");
    this.hiddenField = this.editor.next("input");
    this.element.addClassName("uses_" + this.getParagraphType());

    Object.extend(this.editor, WysiHat.Commands);

    this.loadContents(this.hiddenField.value);

    this.toolbar = this.element.down("div.rich_text_toolbar");
    this.initializeToolbarButtons();

    this.element.observe("selection:change", this.onCursorMove.bind(this));
    this.element.observe("field:change", this.onChange.bind(this));
    this.editor.observe("paste", this.onPaste.bind(this));
    this.editor.observe("blur", this.onBlur.bind(this));

    this.element.observe("link:selection", this.onLinkSelection.bind(this));
  },

  getParagraphType: function() {
    if (Prototype.Browser.WebKit) return "div";
    if (Prototype.Browser.Gecko)  return "br";
    return "p";
  },

  content: function() {
    return WysiHat.Formatting.getApplicationMarkupFrom(this.editor);
  },

  loadContents: function(applicationMarkup) {
    var html = WysiHat.Formatting.getBrowserMarkupFrom(applicationMarkup);
    if (html.blank() && Prototype.Browser.Gecko) html = "<br>";
    this.editor.update(html);
  },

  saveContents: function(text) {
    this.hiddenField.setValue(this.content());
  },

  initializeToolbarButtons: function() {
    this.toolbarButtons = this.toolbar.select("a.button['data-state']");
    this.toolbar.observe("mousedown", this.onToolbarMousedown.bind(this));
    this.toolbar.observe("mouseup", this.onToolbarMouseup.bind(this));
    this.toolbar.observe("click", this.onToolbarClicked.bind(this));

    this.menuObserver = new MenuObserver(this.toolbar);
    this.toolbar.observe("menu:prepared", this.onMenuPrepared.bind(this));
    this.toolbar.observe("menu:activated", this.onMenuActivated.bind(this));
    this.toolbar.observe("menu:deactivated", this.onMenuDeactivated.bind(this));
  },

  onToolbarMousedown: function(event) {
    var button = this.findButtonFromEvent(event);
    if (button) {
      if (this.editorHasFocus()) {
        var state = this.getButtonState(button);
        this["on" + state.capitalize() + "Clicked"].call(this);
        this.updateToolbar();
      }
      event.stop();
    }
  },

  onToolbarMouseup: function(event) {
    var element = this.findButtonFromEvent(event);
    if (element && !element.hasClassName("menu_target")) {
      this.editor.focus();
    }
  },

  onToolbarClicked: function(event) {
    if (this.findButtonFromEvent(event)) {
      event.stop();
    }
  },

  onMenuPrepared: function(event) {
    if (!this.editorHasFocus()) {
      event.stop();
    }
  },

  onMenuActivated: function(event) {
    event.findElement().autofocus();
  },

  onMenuDeactivated: function(event) {
    this.editor.focus();
  },

  findButtonFromEvent: function(event) {
    return event.findElement("a.button['data-state']");
  },

  editorHasFocus: function() {
    return this.element.hasClassName("editor_has_focus");
  },

  onPaste: function() {
    this.onAfterPaste.bind(this).defer();
  },

  onAfterPaste: function() {
    var selection = window.getSelection();
    var selectedRange = selection.getRangeAt(0);
    var bookmark = new Element("bookmark");
    selectedRange.surroundContents(bookmark);

    this.reformatPaste(this.editor);

    bookmark = this.editor.down("bookmark");
    selectedRange = document.createRange();
    selectedRange.selectNode(bookmark);
    selection.removeAllRanges();
    selection.addRange(selectedRange);
    selectedRange.deleteContents();
  },

  reformatPaste: function(pasteContainer) {
    pasteContainer.sanitizeContents({
      remove: "style, link, meta",
      allow:  "span, p, br, strong, b, em, i, a[href], ul, ol, li, div, bookmark",
      skip:   "[_moz_dirty]"
    });

    pasteContainer.select("p").each(function(paragraph) {
      if (paragraph.childNodes.length == 2) {
        var first = paragraph.childNodes[0], second = paragraph.childNodes[1];
        if (first.tagName && first.tagName.toLowerCase() == "span" && first.innerHTML == "" &&
            second.tagName && second.tagName.toLowerCase() == "br") {
          paragraph.remove();
          return;
        }
      } else if (Prototype.Browser.IE && paragraph.innerText == "") {
        paragraph.update("&nbsp;");
      } else if (!Prototype.Browser.IE) {
        var html = paragraph.innerHTML.toLowerCase();
        if (html.match(/^<br>$/)) {
          paragraph.remove();
        } else if (!html.match(/<br><br>$/)) {
          paragraph.insert("<br><br>");
        }
      }
    });
  },

  onBlur: function() {
    this.saveContents();
  },

  onCursorMove: function(event) {
    this.updateToolbar();
  },

  onBoldClicked: function() {
    this.editor.boldSelection();
  },

  onItalicClicked: function() {
    this.editor.italicSelection();
  },

  onOrderedlistClicked: function() {
    var node = window.getSelection().getNode();
    if (this.editor.orderedListSelected() && !node.match("ol li:last-child *"))
      window.getSelection().selectNode(node.up("ol"));
    else if (this.editor.unorderedListSelected())
      window.getSelection().selectNode(node.up("ul"));

    this.editor.toggleOrderedList();
  },

  onUnorderedlistClicked: function() {
    var node = window.getSelection().getNode();
    if (this.editor.unorderedListSelected() && !node.match("ul li:last-child *"))
      window.getSelection().selectNode(node.up("ul"));
    else if (this.editor.orderedListSelected())
      window.getSelection().selectNode(node.up("ol"));

    this.editor.toggleUnorderedList();
  },

  onLinkClicked: function() {
    this.selectionBookmark = null;

    var container = this.element.down(".link_container");
    var input = container.down(".menu_content input");

    var selectedElement = window.getSelection().getNode();
    if (selectedElement && this.editor.linkSelected()) {
      window.getSelection().selectNode(selectedElement);
      selectedElement.value = selectedElement.href;
    } else {
      input.value = "";
    }

    window.getSelection().makeInactiveSelection();
  },

  onLinkSelection: function(event) {
    var container = this.element.down(".link_container");
    this.menuObserver.deactivate(container);

    var inactiveSelection = this.editor.down('span.inactive_selection');
    if (!inactiveSelection) return;

    this.editor.focus();
    window.getSelection().restoreInactiveSelection(inactiveSelection);

    var value = container.down(".menu_content input").value;

    if (value.blank()) {
      this.editor.unlinkSelection();
    } else {
      this.editor.linkSelection(this.tidyUrl(value));
    }
  },

  tidyUrl: function(url) {
    if (!url.match(/^[a-z]+:\/\//i)) {
      url = "http://" + url;
    }
    return url;
  },

  onChange: function(event) {
    this.saveContents();
    this.updateToolbar();
  },

  updateToolbar: function() {
    this.toolbarButtons.each(function(button) {
      var state = this.getButtonState(button);
      if (this.editor.queryCommandState(state)) {
        button.addClassName("selected");
      } else {
        button.removeClassName("selected");
      }
    }, this);
  },

  getButtonState: function(button) {
    return button.readAttribute("data-state");
  }
});

Object.extend(RichTextArea, {
  findAll: function(parent) {
    return $(parent || document.body).select("div.main-content div.editor[contentEditable=true]");
  },

  initializeAll: function() {
    RichTextArea.findAll().each(function(contentEditable) {
      if (!contentEditable.retrieve("richTextArea")) {
        var richTextArea = new RichTextArea(contentEditable);
        contentEditable.store("richTextArea", richTextArea);
      }
    });
  }
});

document.observe("dom:modified", function() {
  RichTextArea.initializeAll();
});

(function() {
  var childSelector = "div.rich_text_area div.editor";
  var parentSelector = "div.rich_text_area";
  var className = "editor_has_focus";

  document.observe("focus:in", function(event) {
    var element = event.findElement(childSelector);
    if (element) element.up(parentSelector).addClassName(className);
  });

  document.observe("focus:out", function(event) {
    var element = event.findElement(childSelector);
    if (element) element.up(parentSelector).removeClassName(className);
  });
})();
