/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Read the html-utility.js file as a string
const htmlUtilityScript = fs.readFileSync(path.resolve(__dirname, '../html-utility.js'), 'utf8');

// Evaluate the script in the global context
eval(htmlUtilityScript);

// Now `htmlUtility` should be available in the global scope

describe('htmlUtility - addClass method', () => {
    test('should add a class to an element', () => {
        // Set up the DOM
        document.body.innerHTML = '<div id="test-element"></div>';

        // Select the element
        const element = document.getElementById('test-element');

        // Use htmlUtility to add a class
        htmlUtility(element).addClass('new-class');

        // Assert that the class was added
        expect(element.classList.contains('new-class')).toBe(true);
    });
});

describe('htmlUtility - removeClass method', () => {
    test('should remove a class from an element', () => {
        document.body.innerHTML = '<div id="test-element" class="existing-class"></div>';

        const element = document.getElementById('test-element');

        htmlUtility(element).removeClass('existing-class');

        expect(element.classList.contains('existing-class')).toBe(false);
    });
});

describe('htmlUtility - toggleFormat method', () => {
    test('should wrap and unwrap selection with formatting tag', () => {
        // Set up the DOM
        document.body.innerHTML = '<div id="editor">This is some text.</div>';
        const editor = document.getElementById('editor');
    
        // Create a range selecting "some text"
        const range = document.createRange();
        const textNode = editor.firstChild;
        const startOffset = 8; // Position after "This is "
        const endOffset = 17; // Position after "some text"
        range.setStart(textNode, startOffset);
        range.setEnd(textNode, endOffset);
    
        // Add the range to the selection
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    
        // Apply bold formatting
        htmlUtility().toggleFormat('strong');
    
        // Simplify tags
        htmlUtility().simplifyAllFormattingTags();
    
        // Assert that the selected text is wrapped in <strong>
        expect(editor.innerHTML).toBe('This is <strong>some text</strong>.');
    
        // Now, recreate the range to select "some text" within the updated DOM
    
        // Remove all ranges from selection
        selection.removeAllRanges();
    
        // Get the <strong> element containing "some text"
        const strongElement = editor.querySelector('strong');
        const newTextNode = strongElement.firstChild; // The text node inside <strong>
    
        // Create a new range that selects the text inside <strong>
        const newRange = document.createRange();
        newRange.setStart(newTextNode, 0);
        newRange.setEnd(newTextNode, newTextNode.length);
    
        // Add the new range to the selection
        selection.addRange(newRange);
    
        // Toggle off the bold formatting
        htmlUtility().toggleFormat('strong');
    
        // Simplify tags
        htmlUtility().simplifyAllFormattingTags();
    
        // Assert that the <strong> tag is removed
        expect(editor.innerHTML).toBe('This is some text.');
    });
});

describe('htmlUtility - simplifyNestedTags method', () => {
    test('should merge adjacent similar tags and remove unnecessary nested tags', () => {
        // Set up the DOM
        document.body.innerHTML = `
        <div id="content">
          <strong>Bold</strong><strong> </strong><strong>Text</strong>
          and
          <strong><strong>More Bold</strong></strong>
          Text.
        </div>
      `;
        const content = document.getElementById('content');

        // Simplify nested tags
        htmlUtility().simplifyNestedTags(['strong'], content);

        // Expected HTML after simplification
        const expectedHTML = `
        <div id="content">
          <strong>Bold Text</strong>
          and
          <strong>More Bold</strong>
          Text.
        </div>
      `.trim();

        // Assert the HTML matches
        expect(content.outerHTML.trim()).toBe(expectedHTML);
    });
});

describe('htmlUtility - clearFormatting method', () => {
    test('should remove all formatting from selected text', () => {
        // Set up the DOM
        document.body.innerHTML = `
        <div id="editor">This is <strong>some <em>formatted</em></strong> text.</div>
      `;
        const editor = document.getElementById('editor');

        // Create a range selecting "some formatted"
        const range = document.createRange();
        const textNode = editor.childNodes[1].firstChild; // Text node inside <strong>
        range.setStart(textNode, 0); // Start of "some "
        const emNode = editor.querySelector('em').firstChild; // Text node inside <em>
        range.setEnd(emNode, emNode.length); // End of "formatted"

        // Add the range to the selection
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Clear formatting
        htmlUtility().clearFormatting();

        // Simplify tags
        htmlUtility().simplifyAllFormattingTags();

        // Expected HTML after clearing formatting
        const expectedHTML = '<div id="editor">This is some formatted text.</div>';

        // Assert the HTML matches
        expect(editor.outerHTML).toBe(expectedHTML);
    });
});