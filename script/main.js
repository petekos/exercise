'use strict'

var query = document.querySelector.bind(document);

var Util = (function(){

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

	function request(method, url, callback){
		var req = new XMLHttpRequest();
		req.onload = callback;
		req.open(method, url, true);
		req.send();	
	}

	function clampDimensions(el, img) {
		el.style.maxWidth = img.naturalWidth +"px";
		el.style.maxHeight = img.naturalHeight + "px";	
	}

	return {
		throttle: throttle,
		request: request,
		clampDimensions: clampDimensions ,
		query: document.querySelector.bind(document)
	}
})();

var CommentViewer = (function(){
	var comments = [];

	function show() {
		displayComments(PhotoViewer.getCurrentPhotoIdx());
		Util.query(".overlay-container").classList.add("flip");
		Util.query(".title").style.display = "none";
		Util.query(".title-bg").style.display = "none";		
	}

	function hide() {
		Util.query(".overlay-container").classList.remove("flip");
		Util.query(".title").style.display = "block";
		Util.query(".title-bg").style.display = "block";	
	}

	function bindEvents() {
		Util.query(".comment").addEventListener("click", show);
		Util.query(".comment-back").addEventListener("click", hide);
		Util.query(".comment-btn").addEventListener("click", addComment);
	}

	function hasComments(photoId) {
		return localStorage.getItem(photoId) != null;
	}

	function displayComments(photoId) {
		console.log(photoId);
		Util.query(".comment-container").innerHTML = "";
		if (hasComments(photoId)) {
			comments = getComments(photoId);
			if (comments != null) {
				for (var i = 0; i < comments.length; i++) {
					displayComment(comments[i]);
				}	
			}	
		}
	}

	function getComments(photoId) {
		return JSON.parse(localStorage.getItem(photoId));
	}

	function addComment() {
		var inputEl = Util.query(".input-container input"),
			comment = {};
		if(inputEl.value != ""){
			comment.text = inputEl.value;
			comment.date = new Date();
			comment.date = comment.date.toLocaleString();
			comment.name = "Anonymous";
			inputEl.value = "";
			displayComment(comment);
			comments.push(comment);
			localStorage.setItem(PhotoViewer.getCurrentPhotoIdx(), JSON.stringify(comments)); 	
		}	
	}

	function displayComment(comment) {
		var commentEl = document.createElement("div"),
		    userNameEl = document.createElement("span"),
			dateEl = document.createElement("div");

		userNameEl.appendChild(document.createTextNode(comment.name));	
		commentEl.appendChild(userNameEl);
		commentEl.appendChild(document.createTextNode(comment.text));
		dateEl.appendChild(document.createTextNode(comment.date));
		commentEl.appendChild(dateEl);
		commentEl.classList.add("comment-content");

		Util.query(".comment-container").appendChild(commentEl);
	}

	function setTitle(title) {
		Util.query(".comment-title-text").textContent = title;
	}

	return {
		bindEvents: bindEvents,
		hide: hide,
		show: show,
		setTitle: setTitle
	}
})();

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
		currentPage = 1,
		eventsBound = false;

	function init(){
		Util.query("button.show").style.display = "none";
		loading(true);
		bindEvents();
		Util.request("get", buildApiUrl(1), loadPhotos);
	}

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
			Util.query(".previous").style.visibility = "hidden"; 
		} else {
			Util.query(".previous").style.visibility = "visible"; 
		}

		if (currentPhotoIdx == (photos.length - 1)) {
			Util.query(".next").style.visibility = "hidden";
		} else {
			Util.query(".next").style.visibility = "visible"; 
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
			Util.request("get", buildApiUrl(currentPage), loadPhotos);	
		}	
	}

	function showPhoto(photo) {
		CommentViewer.hide();
		var img = Util.query(".display-image");

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
		Util.clampDimensions(Util.query(".overlay-content"), img);
		Util.clampDimensions(Util.query(".comment-panel"), img);
		Util.query(".title-text").textContent = photos[currentPhotoIdx].title;
		CommentViewer.setTitle(photos[currentPhotoIdx].title);
		Util.query(".overlay-container").style.display = "block";
		resize();
	}

	function openCurrentPhoto() {
		window.open(buildPhotoUrl(photos[currentPhotoIdx]), "_blank");
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
		Util.query(".overlay-container").style.display = "none";
		Util.query(".screen").style.display = "none";
		Util.query("button.show").style.display = "block"
	}

	function bindEvents() {
		if(!eventsBound){
			Util.query(".previous").addEventListener("click",showPrevious.bind(this));
			Util.query(".next").addEventListener("click",showNext.bind(this));
			window.addEventListener("resize", Util.throttle(resize,50));
			window.addEventListener("keyup", keyNav);
			Util.query(".close").addEventListener("click", closePhoto);
			Util.query(".external-link").addEventListener("click", openCurrentPhoto );
			CommentViewer.bindEvents();	
			eventsBound = true;
		}
		
	}

	function loading(loading) {
		if(isLoading != loading) {
			isLoading = loading;
			var screenEl = Util.query(".screen");
			screenEl.style.display = "block";
			if (loading) {
				loadScreenTimeoutID = setTimeout(function() {
					Util.query(".loading").style.display = "block";
					screenEl.style.zIndex = 2;
				},300);
					
			} else {
				window.clearTimeout(loadScreenTimeoutID);
				screenEl.style.zIndex = 0;
				Util.query(".loading").style.display = "none";
				
			}
		}
	}

	function resize() {
		var width = document.documentElement.clientWidth,
			height = document.documentElement.clientHeight,
			overlay = Util.query(".overlay-content"),
			proposedHeight = 0,
			proposedWidth = 0,
			finalHeight = 0,
			finalWidth = 0;

		proposedHeight  = (height - 80);
		proposedWidth = (width - 120);
		if (proposedHeight < proposedWidth * heightToWidth ) {
			//start from height
			finalWidth = Math.round(proposedHeight * widthToHeight);
			finalHeight = proposedHeight;
		} else {
			//start from width
			finalWidth = proposedWidth; 
			finalHeight = Math.round(proposedWidth * heightToWidth);
		}

		if (finalHeight < 200) {
			Util.query(".overlay-container").classList.add("small");
		} else {
			Util.query(".overlay-container").classList.remove("small")
		}
		Util.query(".comment-panel").style.width = finalWidth + "px";
		Util.query(".comment-panel").style.height = finalHeight + "px";
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
	function getCurrentPhotoIdx(){
		return currentPhotoIdx;
	}
	return {
		init: init,
		getCurrentPhotoIdx: getCurrentPhotoIdx,
		resize: resize,
	};
})();

window.onload = function() {
	Util.query("button.show").addEventListener("click",function() {
		PhotoViewer.init();
	});	
};