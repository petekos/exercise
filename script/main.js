'use strict'
// a couple util methods ...these shouldnt be declared in the global scope
var query = document.querySelector.bind(document);

function throttle(callback, limit){
	var wait = false;
	return function() {
		if (!wait) {
			callback.call();
			wait = true;
			setTimeout(function() {
				wait = false;
			}, limit);
		}
	};
} 

function removeClass(className, classString) {
	var classes = classString.split(" ");
	if(classes.length > 0 ){
		for (var i = 0; i < classes.length; i++) {
			if(className == classes[i]){
				classes[i] = "";
				break;
			}
		}
		return classes.join(" ");	
	}
	
}

var AJAX = {};
AJAX.request = function(method, url, callback) {
	var req = new XMLHttpRequest();
	req.onload = callback;
	req.open(method, url, true);
	req.send();
};

var PhotoViewer = (function() {  
	var photos = [],
		currentPhotoIdx = 0,
		widthToHeight = 0,
		heightToWidth = 0,
		isLoading = false,
		loadScreenTimeoutID,
		currentPreloadIdx = 1,// no need to preload the 0th image
		preload = 5,
		prefetch = 3,
		pages = 0,
		currentPage = 1;

	function buildApiUrl(page) {
		return "https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=93971dd7e74a67b5a30fa23b9def8f8e&photoset_id=72157626579923453&per_page=10&page="+page+"&format=json&nojsoncallback=1"
	}

	function loadPhotos() {
		var response = JSON.parse(this.responseText);
		if (!response.hasOwnProperty('photoset')) {	
			console.error("Response has no photoset property");
		} else {
			pages = response.photoset.pages;
			if (response.photoset.photo.length > 0) {
				photos = photos.concat(response.photoset.photo);
				showPhoto(photos[currentPhotoIdx]);
			} else {
				console.error("Photoset has no photos");	
			}
		}
	}

	function enableNavigation() {

		if (currentPhotoIdx == 0) {
			query(".previous").style.visibility = "hidden"; 
		} else {
			query(".previous").style.visibility = "visible"; 
		}

		if (currentPhotoIdx == (photos.length - 1)) {
			query(".next").style.visibility = "hidden";
		} else {
			query(".next").style.visibility = "visible"; 
		}
	}

	function buildPhotoUrl(photo) {
		return "https://farm" + photo.farm + ".staticflickr.com/" + photo.server + "/" + photo.id + "_" + photo.secret + "_z.jpg";
	}

	function preloadImages() {
		for (var i = currentPreloadIdx; i < (currentPhotoIdx + preload); i++) {
			if(i < photos.length - 1){
				setTimeout(function(){
					var img = new Image();
			    	img.src = buildPhotoUrl(photos[i]);
				},30)
			    currentPreloadIdx++;
			}
			
		}
	}

	function prefetchResults() {
		if (currentPage < pages && (currentPhotoIdx >= (photos.length - prefetch ))) {
			currentPage++;
			AJAX.request("get", PhotoViewer.buildApiUrl(currentPage), PhotoViewer.loadPhotos);	
		}	
	}

	function showPhoto(photo) {
		var img = query(".display-image");

		loading(true);
		img.src = buildPhotoUrl(photo);
		prefetchResults();
		preloadImages();
		if(!img.complete){
			img.onload = function (event) {
					onImageLoad(img);
			};
		} else {
			onImageLoad(img);
		}
	}

	function onImageLoad(img) {
		loading(false);
		enableNavigation();
		widthToHeight = img.naturalWidth/img.naturalHeight;
		heightToWidth = img.naturalHeight/img.naturalWidth;
		query(".overlay-content").style.maxWidth = img.naturalWidth +"px";	
		query(".overlay-content").style.maxHeight = img.naturalHeight + "px";	
		query(".title-text").textContent = photos[currentPhotoIdx].title;
		query(".overlay-container").style.display = "block";
		resize();
	}

	function openCurrentPhoto() {
		window.open(buildPhotoUrl(photos[currentPhotoIdx]),"_blank");
	}

	function showNext() {
		if (currentPhotoIdx == photos.length - 1) {
			return;
		} else {
			currentPhotoIdx++;	
		}
		showPhoto(photos[currentPhotoIdx]);
	}

	function showPrevious() {
		if (currentPhotoIdx == 0 ) {
			return;
		} else {
			currentPhotoIdx--;	
		}
		showPhoto(photos[currentPhotoIdx]);
	}

	function closePhoto() {
		query(".overlay-container").style.display="none";
		query(".screen").style.display="none";
	}

	function bindEvents() {
		query(".previous").addEventListener("click",showPrevious.bind(this));
		query(".next").addEventListener("click",showNext.bind(this));
		window.addEventListener("resize", throttle(PhotoViewer.resize,100));
		window.addEventListener("keyup", PhotoViewer.keyNav);
		query(".close").addEventListener("click", closePhoto);
		query(".external-link").addEventListener("click", openCurrentPhoto );
	}

	function loading(loading) {
		if(isLoading != loading) {
			isLoading = loading;
			var screenEl = query(".screen");
			screenEl.style.display = "block";
			if (loading) {
				loadScreenTimeoutID = setTimeout(function() {
					query(".loading").style.display = "block";
					screenEl.style.zIndex = 2;
				},300);
					
			} else {
				window.clearTimeout(loadScreenTimeoutID);
				
				screenEl.style.zIndex = 0;
				query(".loading").style.display = "none";
				
			}
		}
	}

	function resize() {
		var width = document.documentElement.clientWidth,
			height = document.documentElement.clientHeight,
			overlay = query(".overlay-content"),
			proposedHeight = 0,
			proposedWidth = 0,
			finalHeight = 0,
			finalWidth = 0;

		proposedHeight  = (height - 80);
		proposedWidth = (width - 120);
		if (proposedHeight < proposedWidth * heightToWidth ) {
			//start from height
			finalWidth = (proposedHeight * widthToHeight);
			finalHeight = proposedHeight;
		} else {
			//start from width
			finalWidth = proposedWidth; 
			finalHeight = (proposedWidth * heightToWidth);
		}

		if (finalHeight < 200) {
			query(".overlay-container").className += " small";
		} else {
			query(".overlay-container").className = removeClass("small", query(".overlay-container").className);
		}
		overlay.style.width = finalWidth + "px";
		overlay.style.height = finalHeight + "px";
	}

	function keyNav(e) {
		switch (e.keyCode) {
			case 27:
				closePhoto();
				break;
			case 37:
				showPrevious();
				break;
			case 39:
				showNext();	
				break;
			default:
		}
	}

	return {
		buildApiUrl: buildApiUrl,
		loadPhotos: loadPhotos,
		bindEvents: bindEvents,
		loading : loading,
		resize: resize,
		keyNav: keyNav
	};
})();

window.onload = function() {
	query("button").addEventListener("click",function() {
		PhotoViewer.loading(true);
		PhotoViewer.bindEvents();
		AJAX.request("get", PhotoViewer.buildApiUrl(1), PhotoViewer.loadPhotos);
	});	
};