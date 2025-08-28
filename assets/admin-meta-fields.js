jQuery(document).ready(function($) {
    // Function to show/hide fields based on selected type
    function toggleMetaFields() {
        var selectedTypes = [];
        
        // Get selected taxonomy terms
        $('#fanculo_typechecklist input:checked').each(function() {
            var label = $(this).parent().text().trim();
            selectedTypes.push(label.toLowerCase());
        });
        
        // Update current type display
        if (selectedTypes.length > 0) {
            $('#current-type').text(selectedTypes.join(', '));
        } else {
            $('#current-type').text('No type selected');
        }
        
        // Hide all fields first
        $('.fanculo-field').hide();
        
        // Show relevant fields
        $('.fanculo-field').each(function() {
            var fieldTypes = $(this).data('types').split(',');
            var shouldShow = false;
            
            selectedTypes.forEach(function(selectedType) {
                if (fieldTypes.includes(selectedType)) {
                    shouldShow = true;
                }
            });
            
            if (shouldShow) {
                $(this).show();
            }
        });
        
        // If no type selected, show helpful message
        if (selectedTypes.length === 0) {
            $('.fanculo-field').hide();
        }
    }
    
    // Initial check on page load
    toggleMetaFields();
    
    // Watch for taxonomy changes
    $(document).on('change', '#fanculo_typechecklist input', function() {
        toggleMetaFields();
    });
    
    // Also watch for changes in the new Gutenberg taxonomy panel (if present)
    if (wp && wp.data && wp.data.subscribe) {
        var unsubscribe = wp.data.subscribe(function() {
            // Check if taxonomy terms have changed
            setTimeout(toggleMetaFields, 100);
        });
    }
    
    // Watch for AJAX taxonomy updates (in case of quick edit)
    $(document).ajaxComplete(function(event, xhr, settings) {
        if (settings.data && settings.data.indexOf('fanculo_type') !== -1) {
            setTimeout(toggleMetaFields, 500);
        }
    });
});