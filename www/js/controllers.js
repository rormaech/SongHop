angular.module('songhop.controllers', ['ionic', 'songhop.services'])


/*
Controller for the discover page
*/
.controller('DiscoverCtrl', function($scope, $ionicLoading, $timeout, User, Recommendations) {
  // Helper functions for loading
  var showloading = function() {
    $ionicLoading.show({
      template: '<i class="ion-loading-c"></i>',
      noBackdrop: true
    });
  }

  var hideLoading = function() {
    $ionicLoading.hide();
  }

  // Set loading to true first time while we retrieve songs from server
  showloading();

  // Get our first songs, from the Recommendations factory and play it
  Recommendations.init()
    .then(function() {
      $scope.currentSong = Recommendations.queue[0];
      return Recommendations.playCurrentSong();
    })
    .then(function() {
      // Turn loading off
      hideLoading();
      $scope.currentSong.loaded = true;
    });

  // Fired when we favorite or skip a song
  $scope.sendFeedback = function(bool) {

    //First, add to favorites if they favorited
    if(bool) User.addSongToFavorites($scope.currentSong);

    // Set variable for the correct animation secuence
    $scope.currentSong.rated = bool;
    $scope.currentSong.hide = true;

    // Prepare the next song
    Recommendations.nextSong();

    // timeout to allow animation to complete before changing to the next song
    $timeout(function() {
      // Update current song in scope, taken from the array in the Recommendations factory
      $scope.currentSong = Recommendations.queue[0];
      $scope.currentSong.loaded = false;
    }, 250);

    Recommendations.playCurrentSong()
    .then(function() {
      $scope.currentSong.loaded = true;
    });
  };

  // When skipping songs fast, images take long time to load.
  // Need to solve!! -> Caching the image for the next song.
  // Take advantage of web browser in hybrid dev,
  // using <img src=""> for caching the image in the web browser's cache.
  // Have a img tag with ng-src pointing at the url for the next image in the queue,
  // we can make it invisible with CSS: 1x1px, opacity:0.01 (class img-lookahead)

  $scope.nextAlbumImage = function() {
    if(Recommendations.queue.length > 1){
      return Recommendations.queue[1].image_large;
    }
    return '';
  };

})


/*
Controller for the favorites page
*/
.controller('FavoritesCtrl', function($scope, $window, $ionicActionSheet, User) {

  // Get the list of our favorites from the user service
  $scope.favorites = User.favorites;
  $scope.username = User.username;

  // Remove song from favorites list
  $scope.removeSong = function(song, index) {
    User.removeSongFromFavorites(song, index);
  };

  // Access the favorite song in Spotify using open_url
  $scope.openSong = function(song) {
    $window.open(song.open_url, "_system");
  };

  // Open action sheet
  $scope.showActionSheet = function() {
    // Show the action sheet
    var hideSheet = $ionicActionSheet.show({
      buttons: [
        { text: 'Share this song' }
      ],
      //destructiveText: 'Delete song from favorites',
      cancelText: 'Cancel',
      cancel: function() {
       // add cancel code..
      },
      buttonClicked: function(index) {
        return true;
      },
      destructiveButtonClicked: function(index) {
        return true;
      }
    });
  };



})


/*
Controller for our tab bar
*/
.controller('TabsCtrl', function($scope, $window, User, Recommendations) {
  // Expose the number of new favorites to the scope
  $scope.favCount = User.favoriteCount;

  // Stop audio and reset new favorites to 0 when going to favorites page
  $scope.enteringFavorites = function() {
    User.newFavorites = 0;
    Recommendations.haltAudio();
  }

  // Resume song when leaving favorites page
  $scope.leavingFavorites = function() {
    Recommendations.init();
  }

  // Logic for logging out
  $scope.logout = function() {
    User.destroySession();

    //Instead of using $state.go(), we're going to redirect.
    //reason: we need to ensure views aren't cached.
    $window.location.href = 'index.html';
  }

})

/*
Controller for the splash page
*/
.controller('SplashCtrl', function($scope, $state, User) {
  // Attempt to signup/login via User.auth
  $scope.submitForm = function(username, signingUp) {
    User.auth(username, signingUp).then(function() {
      //Session is now set, so lets redirect to discover page
      $state.go('tab.discover');
    }, function() {
      //Error handling
      alert('Hmm... try another username');
    });
  }

})

;
