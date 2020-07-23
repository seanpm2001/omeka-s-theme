(function($) {
    var baseDomain = 'https://omeka.religiousecologies.org/api/';
        
    $(document).ready(function() {        
        var filterSubmitButton = $('.filter-submit');
        // Chosen select population, taken from Omeka's admin.js
      
        $('.chosen-select').chosen(chosenOptions);

        // Along with CSS, this fixes a known bug where a Chosen dropdown at the
        // bottom of the page breaks layout.
        // @see https://github.com/harvesthq/chosen/issues/155#issuecomment-173238083
        $(document).on('chosen:showing_dropdown', '.chosen-select', function(e) {
            var chosenContainer = $(e.target).next('.chosen-container');
            var dropdown = chosenContainer.find('.chosen-drop');
            var dropdownTop = dropdown.offset().top - $(window).scrollTop();
            var dropdownHeight = dropdown.height();
            var viewportHeight = $(window).height();
            if (dropdownTop + dropdownHeight > viewportHeight) {
                chosenContainer.addClass('chosen-drop-up');
            }
        });
        
        $(document).on('chosen:hiding_dropdown', '.chosen-select', function(e) {
            $(e.target).next('.chosen-container').removeClass('chosen-drop-up');
        });
        
        $(document).on('change', '.chosen-select', function() {
            var filterSelected = $(this).find(':selected');
            var filterLabel = filterSelected.text();
            var filterId = filterSelected.val();
            var propertiesIndex = $('#are-filters').data('properties-index');
            if (filterId > 0) {
                updateFilterSelect($(this), filterId, filterLabel, propertiesIndex);
            }
        });
        
        $(document).on('change', '[name="joiner"]', function() {
            var joinerSelect = $(this);
            var filterLink = joinerSelect.next('.filter-link');
            var filterParam = filterLink.data('filter-param');
            var joinerRegex = new RegExp(/(\[joiner\]\=).+?(?=\&)/);
            var newParam = filterParam.replace(joinerRegex, '[joiner]=' + joinerSelect.val());
            filterLink.data('filter-param', newParam);
        });
        
        $(document).on('click', '.clear-filter', function() {
            var filterLink = $(this).prev('a');
            var filterId = filterLink.data('filter-id');
            var filterResourceType = filterLink.data('resource-type');
            var filterContainer = $('.filter-select[data-resource-type="' + filterResourceType + '"]');
            var filterParam = filterLink.data('filter-param');
            filterContainer.find('option[value="' + filterId + '"]').attr('disabled', false);
            filterContainer.find('.chosen-select').trigger('chosen:updated');
            filterLink.parents('li').remove();
        });
                
        // Build search query
        
        filterSubmitButton.click(function(e) {
            e.preventDefault();
            var currentQuery = filterSubmitButton.attr('href');
            currentQuery = currentQuery + "?";
            $('.filter-link').each(function() {
                var filterParam = $(this).data('filter-param');
                currentQuery = currentQuery + filterParam + "&";
            });
            window.location.href = currentQuery;
        });
        
        // Check for active filters
        
        $('.filter-data').each(function() {
            var filterData = $(this);
            if (filterData.data('activeIds') !== "") {
                applyActiveFilters(filterData);
            }
        });
    });
    
    var populateChildFilter = function(resourceType, parentResourceType, heading, filterParam, filterId) {
        if ($('.filter-select[data-property-id="' + filterId + '"]').length > 0) {
          return;
        }
        var newFilterSelect = $('[data-resource-type="template"]').clone();
        var newFilterSelectInput = newFilterSelect.find('select');
        var propertyId = $('.filter-data[data-resource-type="' + resourceType + '"]').data('property-id');

        var templateFilterKey = newFilterSelect.data('filter-key');
        var newFilterKey = templateFilterKey.replace('$TEMPLATE-ID', propertyId);
        newFilterSelect.data('filterKey', newFilterKey);

        newFilterSelect.attr('data-resource-type', resourceType);
        newFilterSelect.attr('data-property-id', filterId); 
        $('.filter-select[data-resource-type="' + parentResourceType + '"]').after(newFilterSelect);
        newFilterSelectInput.addClass('chosen-select').chosen(chosenOptions);
        
        var apiSearchUrl = baseDomain + 'items?' + filterParam;
        newFilterSelect.addClass('child');
        newFilterSelect.find('h4').text(heading);
        newFilterSelect.attr('data-updated', 'true');
        $.get(apiSearchUrl, function(data) {
            $.each(data, function() {
                var newOption = $('<option value="' + this['o:id'] + '">' + this['dcterms:title'][0]['@value'] + '</option>');
                if ($('.filter-link[data-filter-id="' + this['o:id'] + '"]').length > 0) {
                  newOption.attr('disabled', true);
                }
                newFilterSelectInput.append(newOption);
                newFilterSelectInput.trigger('chosen:updated');
            });
        });
    };
    
    var updateFilterSelect = function(chosenSelect, filterId, filterLabel, propertiesIndex) {
        var filterContainer = chosenSelect.parents('.filter-select');
        var filterParam = filterContainer.data('filter-key') + '=' + filterId;
        var filterParam = updateQueryIndex(filterParam);
        
        if (filterContainer.hasClass('child')) {
          addSelectedFilter(propertiesIndex, filterParam, filterId, filterContainer.data('resource-type'), filterLabel);           
        }

        if (chosenSelect.parents('[data-resource-type="mare:denominationFamily"]').length > 0) {
          populateChildFilter('mare:denomination', 'mare:denominationFamily', filterLabel, filterParam, filterId);
        }
        
        if (chosenSelect.parents('[data-resource-type="mare:stateTerritory"]').length > 0) {
          populateChildFilter('mare:county', 'mare:stateTerritory', filterLabel, filterParam, filterId);
        }
        var filterSelected = chosenSelect.find('[value="' + filterId + '"]');
        filterSelected.attr('disabled', true);
        
        chosenSelect.val('').trigger('chosen:updated');          
    };
    
    var addSelectedFilter = function(propertiesIndex, filterParam, filterId, resourceType, filterLabel) {
        var selectedFilters = $('.selected-filters');
        var filterLink = $(selectedFilters.data('filterLinkTemplate'));
        var filterAnchor = filterLink.find('.filter-link');
        filterLink.data('index', propertiesIndex);
        filterAnchor.text(filterLabel);
        filterAnchor.attr({
          'data-filter-param': filterParam,
          'data-filter-id': filterId,
          'data-resource-type': resourceType
        });
        filterLink.appendTo(selectedFilters);
        selectedFilters.parents('#filter-query').removeClass('empty');          
    };
    
    var applyActiveFilters = function(filterData) {
      var filterActivePropertyData = filterData.data('activeIds');
      if (!filterActivePropertyData) {
        return;
      }
      var propertyId = filterData.data('propertyId');
      var resourceType = filterData.data('resourceType');
      var parentResourceType = filterData.data('parentResourceType');
      if (typeof(filterActivePropertyData) == 'string') {
        var activePropertyIds = filterActivePropertyData.split(',');
      } else {
        var activePropertyIds = [filterActivePropertyData];
      }
      $.each(activePropertyIds, function(index, value) {
        var filterOption = $('.filter-select option[value="' + value + '"]');
        var propertiesIndex = $('#are-filters').data('properties-index');
        if (filterOption.length == 0) {
          $.get(baseDomain + 'items/' + value, function(data) {
            var filterLabel = data['o:title'];
            var parentFilterLabel = data[parentResourceType][0]['display_title'];
            filterId = data[parentResourceType][0]['value_resource_id'];
            var templateFilterKey = $('[data-resource-type="template"]').data('filter-key');
            var filterParam = templateFilterKey.replace('$TEMPLATE-ID', propertyId);
            filterParam = updateQueryIndex(filterParam) + '=' + value;
            addSelectedFilter(propertiesIndex, filterParam, value, resourceType, filterLabel);
          });
        }
      });
    };
    
    var updateQueryIndex = function(filterParam) {
      var propertiesIndex = $('#are-filters').data('properties-index');
      if (filterParam.indexOf('INDEX') > -1) {
        var indexString = 'INDEX';
        indexString = new RegExp(indexString, 'g');
        if (typeof propertiesIndex !== 'undefined') {
          propertiesIndex = propertiesIndex + 1;                    
        } else {
          propertiesIndex = 0;
        }
        $('#are-filters').data('properties-index', propertiesIndex);
        filterParam = filterParam.replace(indexString, propertiesIndex);
        return filterParam;
      }      
    };

})(jQuery)