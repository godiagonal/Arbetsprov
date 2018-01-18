!function() {

  /**
   * @class
   */
  function Helpers() {}

  /**
   * Debounces a function for X milliseconds.
   * @param {callback} callback The function to be executed when the debounce timer has finished
   * @param {number} time The amount of milliseconds to debounce
   * @returns {Object}
   */
  Helpers.debounce = function(callback, time) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        timeout = null;
        callback.apply(context, args);
      }, time);
    };
  }
  
  /**
   * Convert date object into format YYYY-MM-DD HH:MM
   * @param {date} date 
   * @returns {string}
   */
  Helpers.formatDateTime = function(date) {
    var year = date.getFullYear(),
        month = date.getMonth() + 1,
        day = date.getDate(),
        hours = date.getHours(),
        minutes = date.getMinutes();

    month = month < 10 ? '0' + month : month;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
  }

  /**
   * Custom wrapper for XHR, used to make HTTP requests easier.
   * @param {Object} settings
   * @param {string} settings.responseType
   * @param {string} settings.method
   * @param {string} settings.url
   * @param {Object} settings.body
   * @param {callback} settings.success Function called if request is successful, returns response
   * @param {callback} settings.error Function called if request fails, returns response
   * @param {callback} settings.complete Function called when request is completed, even if the request has failed, returns response
   * @returns {XMLHttpRequest}
   */
  function HttpRequest(settings) {
    var request = new XMLHttpRequest();
    
    request.responseType = settings.responseType || 'json';
  
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status == 200) {
          if (settings.success) {
            settings.success.call(request, request.response); // Success callback
          }
        }
        else if (settings.error) {
          settings.error.call(request, request.response); // Error callback
        }
        
        if (settings.complete) {
          settings.complete.call(request, request.response); // Completed callback
        }
  
        request.onreadystatechange = null;
      }
    }
  
    request.open(settings.method, settings.url, true);
    request.send(settings.body || null);
  
    return request;
  }

  /**
   *  Wrapper for iTunes REST API.
   */
  function iTunesApi() {
    var self = this,
        request = null;

    var BASE_URL = 'https://itunes.apple.com';

    /**
     * Searches iTunes for songs with a given search term.
     * @param {Object} settings
     * @param {Object} settings.params
     * @param {string} settings.params.terms Term to search for
     * @param {callback} settings.success Function called if request is successful, returns response
     * @param {callback} settings.error Function called if request fails, returns response
     */
    self.searchTrack = function(settings) {
      if (request) request.abort();

      var url = BASE_URL + '/search?term={{term}}&media=music&entity=musicTrack';

      request = new HttpRequest({
        method: 'get',
        url: url.replace('{{term}}', encodeURIComponent(settings.params.term)),
        success: settings.success,
        error: settings.error,
        complete: function() {
          request = null;
        },
      });
    }
  }

  /**
   * Wrapper for functionality and events related to the search input HTML element.
   * @param {string} id Id of element
   */
  function searchInput(id) {
    var self = this,
        inputElement = document.getElementById(id);
      
    var DEBOUNCE_TIME = 250; // Milliseconds
    
    /**
     * Event handler for when the input value changes (debounced by 250ms).
     * @param {callback} callback Function called when input value changes, returns value of input
     */
    self.onChange = function(callback) {
      inputElement.addEventListener('input', Helpers.debounce(function(ev) {
        callback.call(ev, ev.target.value);
      }, DEBOUNCE_TIME));
    };

    /**
     * Event handler for when the focus state of the input changes.
     * @param {callback} callback Function called when focus state changes, returns true if input is focused
     */
    self.onFocusStateChange = function(callback) {
      inputElement.addEventListener('focus', function(ev) {
        callback.call(ev, true);
      });

      /**
       * I don't use the blur event here since it prevents the click event from firing
       * when clicking on a search result
       */
      document.addEventListener('click', function(ev) {
        if (ev.target !== inputElement)
          callback.call(ev, false);
      });
    };
  }

  /**
   * Wrapper for functionality and events related to the search results HTML element.
   * @param {string} id Id of element
   */
  function searchResults(id) {
    var self = this,
        listElement = document.getElementById(id),
        onSelectCallback = null;
    
    self.data = [];

    /**
     * Event handler for when user clicks a search result.
     * @param {callback} callback Function called when a search result is clicked, returns title of search result
     */
    self.onSelect = function(callback) {
      onSelectCallback = callback;
    };

    /**
     * Updates the list of search results.
     * @param {string[]} items List of search result titles
     */
    self.set = function(items) {
      self.data = items;

      updateList();
    };

    /**
     * Empties the list of search results.
     */
    self.empty = function() {
      self.data = [];

      updateList();
    };

    /**
     * Toggles visibility of the search results list.
     * @param {boolean} show 
     */
    self.toggle = function(show) {
      if (show)
        listElement.style.display = 'block';
      else
        listElement.style.display = 'none';
    };
    
    /**
     * Syncs DOM with items in self.data.
     */
    function updateList() {
      listElement.innerHTML = '';

      self.data.forEach(function(item) {
        var option = document.createElement('option');
        option.innerHTML = item;
  
        option.addEventListener('click', function(ev) {
          if (onSelectCallback) {
            onSelectCallback.call(ev, item);
          }
        });
  
        listElement.appendChild(option);
      });
    }
  }

  /**
   * Wrapper for functionality and events related to the search history HTML element.
   * @param {string} id Id of element
   */
  function searchHistory(id) {
    var self = this,
        listElement = document.getElementById(id);

    self.data = [];

    /**
     * Adds item to search history list.
     * @param {string} title
     */
    self.add = function(title) {
      if(isDuplicate(title)) {
        console.warn('Aborted attempt to add duplicate to history.', title);
        return;
      }

      self.data.push({
        created: new Date(),
        title: title,
      });

      updateList();
    };

    /**
     * Removes item from the search history list.
     * @param {string} title
     */
    self.remove = function(title) {
      self.data.forEach(function(item, index) {
        if (item.title === title) {
          self.data.splice(index, 1);
        }
      });

      updateList();
    }

    /**
     * Checks if search history list contains a given title.
     * @param {string} title 
     * @returns {boolean}
     */
    function isDuplicate(title) {
      return self.data.some(function(item) {
        return item.title === title;
      });
    }

    /**
     * Syncs DOM with items in self.data.
     */
    function updateList() {
      listElement.innerHTML = '';
      
      self.data.forEach(function(item) {
        var li = document.createElement('li');

        var container = document.createElement('div');
        container.classList.add('container');

        var title = document.createElement('div');
        title.classList.add('search-history__title');
        title.innerHTML = item.title;

        var created = document.createElement('div');
        created.classList.add('search-history__created');
        created.innerHTML = Helpers.formatDateTime(item.created);

        var button = document.createElement('button');
        button.classList.add('search-history__remove');

        button.addEventListener('click', function(ev) {
          self.remove.call(ev, item.title);
        });

        container.appendChild(title);
        container.appendChild(created);
        container.appendChild(button);

        li.appendChild(container);
  
        listElement.appendChild(li);
      });

      self.toggle(self.data.length > 0);
    }

    /**
     * Toggles visibility of the search history list.
     * @param {boolean} show 
     */
    self.toggle = function(show) {
      if (show)
        listElement.style.display = 'block';
      else
        listElement.style.display = 'none';
    };
  }

  /**
   * Wait for DOM to load and bind all DOM events.
   * This ties the DOM elements to the data source (iTunes REST API).
   */
  window.addEventListener('load', function() {
    var MIN_TERM_LENGTH = 3,
        MAX_RESULTS = 5

    var iTunes = new iTunesApi();

    var gui = {
      searchInput: new searchInput('search-input'),
      searchResults: new searchResults('search-results'),
      searchHistory: new searchHistory('search-history'),
    }

    /**
     * Do iTunes search when input value changes (debounced by 250ms)
     */
    gui.searchInput.onChange(function(value) {
      // Empty results if input value is not long enough
      if (!value || value.length < MIN_TERM_LENGTH) {
        gui.searchResults.empty();
        return;
      }

      iTunes.searchTrack({
        params: {
          term: value,
        },
        success: function(data) {
          // Limit to X results and combine artist name with song name before displaying
          var formattedResults = data.results
            .splice(0, MAX_RESULTS)
            .map(function(result) {
              return result.artistName + ' - ' + result.trackName;
            });

          gui.searchResults.set(formattedResults);
        },
        error: function(err) {
          console.error('An error occurred while fetching from iTunes.', err);
        },
      });
    });

    /**
     * Show/hide the search results list depending on the input focus state
     */
    gui.searchInput.onFocusStateChange(gui.searchResults.toggle);

    /**
     * Add search result to history list when clicking.
     */
    gui.searchResults.onSelect(gui.searchHistory.add);
  });

}();