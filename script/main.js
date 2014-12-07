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
	    currentPhoto = 0,
	    isLoading = false,
	    loadScreenTimeoutID;

	function loadPhotos() {
		var response = JSON.parse(this.responseText);
		console.log(response)
		if (response.hasOwnProperty('photoset')){
			photos = response.photoset.photo;	
		} else {
			console.error("Response has no photoset property");	
		}
		if(photos.length > 0){
			showPhoto(photos[currentPhoto]);	
		}else {
			console.error("Photoset has no photos");	
		}
	}

    function buildPhotoUrl(photo) {
    	return "https://farm" + photo.farm + ".staticflickr.com/" + photo.server + "/" + photo.id + "_" + photo.secret + "_z.jpg";
    }

	function showPhoto(photo) {
		loading(true);
		var img = document.querySelector(".display-image");
		img.src = buildPhotoUrl(photo);
		
		img.onload= function () {
			loading(false)
			document.querySelector(".title").textContent = photo.title;
			document.querySelector(".overlay-container").style.display = "block";

		}
	}

    function showNext(){
    	if(currentPhoto == photos.length - 1){
    		currentPhoto = 0; 
    	} else{
    		currentPhoto = currentPhoto + 1;	
    	}
		
		showPhoto(photos[currentPhoto]);
    }

    function showPrevious(){
    	if(currentPhoto == 0 ) {
    		currentPhoto = photos.length - 1;
    	} else {
    		currentPhoto = currentPhoto - 1;	
    	}
		
    	showPhoto(photos[currentPhoto]);
    }

    function bindEvents(){
    	document.querySelector(".previous").addEventListener("click",showPrevious.bind(this));
    	document.querySelector(".next").addEventListener("click",showNext.bind(this));
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
	    		console.log(screenEl.firstChild);
	    		if(screenEl.firstChild) {
	    			screenEl.style.zIndex = 0;

	    			screenEl.removeChild(screenEl.firstChild);
	    		}
				

	    	}
    	}
    }

	return {
		url: url,
		loadPhotos : loadPhotos,
		bindEvents : bindEvents,
		loading : loading
	};
})();

window.onload = function(){
	PhotoViewer.loading(true)
	PhotoViewer.bindEvents();
	AJAX.request("get", PhotoViewer.url, PhotoViewer.loadPhotos);
};