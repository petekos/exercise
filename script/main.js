'use strict'
var AJAX = {};

AJAX.request = function(method, url, callback) {
	var req = new XMLHttpRequest();
	req.onload = callback;
	req.open(method, url, true);
	req.send();
};

var PhotoViewer = (function() {
	var url = "https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=93971dd7e74a67b5a30fa23b9def8f8e&photoset_id=72157626579923453&format=json&nojsoncallback=1",
	    photos = [],
	    currentPhotoIdx = 0,
	    widthToHeight = 0,
	    heightToWidth = 0,
	    isLoading = false,
	    loadScreenTimeoutID,
	    currentPreloadIdx = 1,// no need to preload the 0th image
	    preloadAmount = 5;

	function loadPhotos() {
		var response = JSON.parse(this.responseText);
		if (response.hasOwnProperty('photoset')) {
			photos = response.photoset.photo;	
		} else {
			console.error("Response has no photoset property");	
		}

		if (photos.length > 0) {
			showPhoto(photos[currentPhotoIdx]);
			preloadImages();	
		} else {
			console.error("Photoset has no photos");	
		}
	}

    function buildPhotoUrl(photo) {
    	return "https://farm" + photo.farm + ".staticflickr.com/" + photo.server + "/" + photo.id + "_" + photo.secret + "_z.jpg";
    }

    function preloadImages() {
    	for( var i = currentPreloadIdx; i < (currentPhotoIdx + preloadAmount); i++) {
    		var img = new Image();
    		img.src =buildPhotoUrl(photos[i]);
    		currentPreloadIdx++;
    	}
    }

	function showPhoto(photo) {
		var img = document.querySelector(".display-image");
		loading(true);
		img.src = buildPhotoUrl(photo);
		preloadImages();
		img.onload= function () {
			loading(false);
			widthToHeight = img.naturalWidth/img.naturalHeight;
			heightToWidth = img.naturalHeight/img.naturalWidth;
			document.querySelector(".overlay-content").style.maxWidth = img.naturalWidth +"px";	
			document.querySelector(".overlay-content").style.maxHeight = img.naturalHeight + "px";	
			document.querySelector(".title").textContent = photo.title;
			document.querySelector(".overlay-container").style.display = "block";
			resize();
		}
	}

    function showNext(){
    	if (currentPhotoIdx == photos.length - 1) {
    		currentPhotoIdx = 0; 
    	} else {
    		currentPhotoIdx = currentPhotoIdx + 1;	
    	}
		
		showPhoto(photos[currentPhotoIdx]);
    }

    function showPrevious(){
    	if(currentPhotoIdx == 0 ) {
    		currentPhotoIdx = photos.length - 1;
    	} else {
    		currentPhotoIdx = currentPhotoIdx - 1;	
    	}
		
    	showPhoto(photos[currentPhotoIdx]);
    }

    function bindEvents(){
    	document.querySelector(".previous").addEventListener("click",showPrevious.bind(this));
    	document.querySelector(".next").addEventListener("click",showNext.bind(this));
    	window.addEventListener("resize", PhotoViewer.resize);
		window.addEventListener("keyup", PhotoViewer.keyNav);
    }

    function loading(loading){
    	if(isLoading != loading ){
			isLoading = loading;
	    	var screenEl = document.querySelector(".screen");
	    	if(loading){
	    		loadScreenTimeoutID = setTimeout(function(){
	    			var loadingEl = document.createElement("div");
	    			var loadingText = document.createTextNode("LOADING"); 
	  				loadingEl.appendChild(loadingText); 
	    			screenEl.appendChild(loadingEl);
	    			screenEl.style.zIndex = 2;
	    		},300);
	    			
	    	}else {
	    		window.clearTimeout(loadScreenTimeoutID);
	    		if(screenEl.firstChild) {
	    			screenEl.style.zIndex = 0;
	    			screenEl.removeChild(screenEl.firstChild);
	    		}
	    	}
    	}
    }

    function resize(){
    	var width = document.documentElement.clientWidth,
    	    height = document.documentElement.clientHeight,
    	    overlay = document.querySelector(".overlay-content"),
    	    proposedHeight = 0,
    	    proposedWidth = 0;

    	proposedHeight  = (height - 80);
    	proposedWidth = (width - 80);
    	if (proposedHeight < proposedWidth * heightToWidth ) {
    		//start from height
    		overlay.style.width = (proposedHeight * widthToHeight)+"px";
    		overlay.style.height = proposedHeight +"px";
    	} else {
    		//start from width
    		overlay.style.width = proposedWidth +"px"; 
    		overlay.style.height = (proposedWidth * heightToWidth) +"px";
    	}
    }

    function keyNav(e){
    	if (e.keyCode ==37) {
    		showPrevious();
    	} else if (e.keyCode == 39) {
    		showNext();
    	}
    }

	return {
		url: url,
		loadPhotos: loadPhotos,
		bindEvents: bindEvents,
		loading : loading,
		resize: resize,
		keyNav: keyNav
	};
})();

window.onload = function(){
	PhotoViewer.loading(true);
	PhotoViewer.bindEvents();
	AJAX.request("get", PhotoViewer.url, PhotoViewer.loadPhotos);
};