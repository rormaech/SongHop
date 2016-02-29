angular.module('songhop.services', ['ionic.utils'])

.factory('User', function($http, $q, $localstorage, SERVER) {
    var o = {
      favorites: [],
      newFavorites: 0,
      //username and session_id will be saved in localStorage
      username: false,
      session_id: false
    };

    o.addSongToFavorites = function(song) {
      // Make sure there is a song to add
      if(!song) return false;

      // Add to favorites array
      o.favorites.unshift(song);
      o.newFavorites++;

      // Persist this to the server (song and user session)
      return $http.post(SERVER.url + '/favorites', {session_id: o.session_id, song_id: song.song_id});
    };

    o.removeSongFromFavorites = function(song, index) {
      // Make sure there is a song to remove
      if(!song) return false;

      // Remove from favorites array
      o.favorites.splice(index, 1);

      // Persist this to the server
      return $http({
        method: 'DELETE',
        url: SERVER.url + '/favorites',
        params: {session_id: o.session_id, song_id:song.song_id}
      });
    };

    o.populateFavorites = function() {
      // Gets the entire list of this user's favs from server
      return $http({
        method: 'GET',
        url: SERVER.url + '/favorites',
        params: {session_id: o.session_id}
      }).success(function(data) {
        //Merge data into the queue
        o.favorites = data;
      });
    };

    o.favoriteCount = function() {
      return o.newFavorites;
    }

    // Attempt login or signup, return a $http promise
    o.auth = function(username, signingUp) {
      var authRoute;

      if(signingUp){
        authRoute = 'signup'
      }
      else{
        authRoute = 'login'
      }

      return $http.post(SERVER.url + '/' + authRoute, {username: username})
      .success(function(data) {
        //Fire the setSession method with the data returned from the server
        o.setSession(data.username, data.session_id, data.favorites);
      });
    }

    o.setSession = function(username, session_id, favorites) {
      if(username) o.username = username;
      if(session_id) o.session_id = session_id;
      if(favorites) o.favorites = favorites;

      // Set data in localStorage object
      $localstorage.setObject('user', {username: username, session_id: session_id});
    }

    // Check if there is currently a user session
    o.checkSession = function() {
      var defer = $q.defer();

      if(o.session_id){
        //If this session is already initialized in the service
        defer.resolve(true);
      }
      else{
        //Detect if there is a session in localstorage from previous use.
        //If it is, pull into our service
        var user = $localstorage.getObject('user');

        if(user.username){
          //if there is a user, lets grab their favorites from the server
          o.setSession(user.username, user.session_id);
          o.populateFavorites().then(function() {
            defer.resolve(true);
          });
        }
        else{
          //no user info in localstorage, reject
          defer.resolve(false);
        }
      }

      return defer.promise;
    };

    // Wipe out our session data, User service variables and localStorage object
    o.destroySession = function() {
      $localstorage.setObject('user', {});
      o.username = false;
      o.session_id = false;
      o.favorites = [];
      o.newFavorites = 0;
    };

    return o;
})

// Service that will handle retrieving, storing and manipulating our queue of song recommendations
.factory('Recommendations', function($http, SERVER, $q) {
  // Since the factory is interacting with the server, inculde $http and SERVER constant

  // Object with an array for the songs
  var o = {
    queue: []
  };
  // Variable for the HTMLAudioElement/Cordova media plugin
  var media;

  // Method to get new song recommendations
  o.getNextSongs = function() {
    // Retrieve songs as a GET request.
    // The success() function adds the new songs to the queue array
    return $http({
      method: 'GET',
      url: SERVER.url + '/recommendations'
    }).success(function(data) {
      // merge data into the queue
      o.queue = o.queue.concat(data);
    });
  };

  // Method to remove the current song from the queue and proceed to the next one
  o.nextSong = function() {
    // Pop the index 0 off
    o.queue.shift();
    // Stop the song
    o.haltAudio();
    // Low on the queue? Lets fill it up
    if(o.queue.length <= 3){
      o.getNextSongs();
    }
  };

  // Method to play the song. Uses promises '$q', a service that helps you run functions
  // asynchronously, and use their return values (or exceptions) when they are done processing.
  o.playCurrentSong = function() {
    // Creates a Deferred object which represents a task which will finish in the future
    var defer = $q.defer();

    // Play the current song's preview
    media = new Audio(o.queue[0].preview_url);

    // When song loaded, resolve the promise to let controller know
    media.addEventListener("loadeddata", function() {
      defer.resolve();
    });

    media.play();
    return defer.promise;
  };

  // Pauses the song when switching to favorites tab
  o.haltAudio = function() {
    if(media) media.pause();
  };

  // Method to retrieve songs (if there aren't any in the queue)
  // or play the current song (if there's at least one in the queue)
  o.init = function() {
    if(o.queue.length === 0){
      // If there's nothing in the queue, fill it.
      // This also means that this is the first call of init
      return o.getNextSongs();
    }
    else{
      // Otherwise play current song
      return o.playCurrentSong();
    }
  };

  return o;

})
;
