jQuery(document).ready(function($) {
    'use strict';

    // Handle taxonomy term selection changes
    $(document).on('change', 'input[name="tax_input[funculo_type][]"], select[name="tax_input[funculo_type][]"]', function() {
        handleTaxonomyChange();
    });

    // Handle term selection in meta box
    $(document).on('change', '#funculo_typechecklist input[type="checkbox"]', function() {
        handleTaxonomyChange();
    });

    function handleTaxonomyChange() {
        var selectedTerms = getSelectedTerms();

        if (selectedTerms.length === 0) {
            hideAllMetaBoxes();
            return;
        }

        // Show/hide meta boxes based on selected terms
        toggleMetaBoxes(selectedTerms);
    }

    function getSelectedTerms() {
        var terms = [];

        // Check checkboxes
        $('#funculo_typechecklist input[type="checkbox"]:checked').each(function() {
            var termSlug = $(this).val();
            if (termSlug && termSlug !== '0') {
                terms.push(termSlug);
            }
        });

        return terms;
    }

    function toggleMetaBoxes(selectedTerms) {
        // Hide all meta boxes first
        hideAllMetaBoxes();

        // Show relevant meta boxes
        selectedTerms.forEach(function(term) {
            switch(term) {
                case funculoAdmin.terms.blocks:
                    showMetaBox('#funculo_blocks_metabox');
                    break;
                case funculoAdmin.terms.symbols:
                    showMetaBox('#funculo_symbols_metabox');
                    break;
                case funculoAdmin.terms.scssPartials:
                    showMetaBox('#funculo_scss_partials_metabox');
                    break;
            }
        });
    }

    function hideAllMetaBoxes() {
        hideMetaBox('#funculo_blocks_metabox');
        hideMetaBox('#funculo_symbols_metabox');
        hideMetaBox('#funculo_scss_partials_metabox');
    }

    function showMetaBox(selector) {
        $(selector).slideDown(300);
    }

    function hideMetaBox(selector) {
        $(selector).slideUp(300);
    }

    // Initialize code editor enhancements
    initCodeEditors();

    function initCodeEditors() {
        $('.funculo-code-editor').each(function() {
            var textarea = $(this);
            var language = textarea.data('language') || 'text';

            // Add syntax highlighting class
            textarea.addClass('language-' + language);

            // Add line numbers and basic styling
            enhanceCodeEditor(textarea);
        });

        $('.funculo-json-editor').each(function() {
            var textarea = $(this);
            enhanceJsonEditor(textarea);
        });
    }

    function enhanceCodeEditor(textarea) {
        // Basic code editor enhancements
        textarea.on('keydown', function(e) {
            // Tab key handling
            if (e.keyCode === 9) {
                e.preventDefault();
                var start = this.selectionStart;
                var end = this.selectionEnd;
                var val = this.value;

                this.value = val.substring(0, start) + '\t' + val.substring(end);
                this.selectionStart = this.selectionEnd = start + 1;
            }
        });

        // Auto-indentation for braces
        textarea.on('keypress', function(e) {
            if (e.keyCode === 13) { // Enter key
                var val = this.value;
                var start = this.selectionStart;
                var lineStart = val.lastIndexOf('\n', start - 1) + 1;
                var lineEnd = val.indexOf('\n', start);
                if (lineEnd === -1) lineEnd = val.length;

                var currentLine = val.substring(lineStart, lineEnd);
                var indent = currentLine.match(/^\s*/)[0];

                // Add extra indent if previous line ends with {
                if (currentLine.trim().endsWith('{')) {
                    indent += '\t';
                }

                setTimeout(function() {
                    var newStart = textarea.selectionStart;
                    textarea.value = textarea.value.substring(0, newStart) + indent + textarea.value.substring(newStart);
                    textarea.selectionStart = textarea.selectionEnd = newStart + indent.length;
                }, 1);
            }
        });
    }

    function enhanceJsonEditor(textarea) {
        textarea.on('blur', function() {
            var val = this.value.trim();
            if (val === '') return;

            try {
                var parsed = JSON.parse(val);
                this.value = JSON.stringify(parsed, null, 2);
                $(this).removeClass('error');
            } catch (e) {
                $(this).addClass('error');
                // Show error message
                showJsonError($(this), e.message);
            }
        });
    }

    function showJsonError(element, message) {
        var errorDiv = element.siblings('.json-error');
        if (errorDiv.length === 0) {
            errorDiv = $('<div class="json-error" style="color: #d63638; font-size: 12px; margin-top: 5px;"></div>');
            element.after(errorDiv);
        }
        errorDiv.text('JSON Error: ' + message);

        setTimeout(function() {
            errorDiv.fadeOut(function() {
                errorDiv.remove();
            });
        }, 5000);
    }

    // Initialize on page load
    $(window).on('load', function() {
        // Trigger initial taxonomy change to show/hide appropriate meta boxes
        if ($('#funculo_typechecklist input[type="checkbox"]:checked').length > 0) {
            handleTaxonomyChange();
        } else {
            hideAllMetaBoxes();
        }
    });
});