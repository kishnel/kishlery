/*
Copyright 2008, 2011 Marcello Mascia

This file is part of Kishlery.

Kishlery is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Kishlery is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Kishlery. If not, see <http://www.gnu.org/licenses/>
*/

var Kishlery = new Class({

	Implements: Options,

	// Cose varie
	nodes: null,
	owner_id: null,
	ownername: null,
	showOwner: null,
	mainContainer: null,
	picsContainer: null,
	previous: null,
	current: null, 
	buttons: null,
	thumbnails: null,
	thumbsContainer: null,
	mosaic: null,
	dashboard: null,
	myPictures: new Array(),
	isPicChecked: new Array(),
	isPicLoaded: new Array(),
	myThumbs: new Array(),
	isThumbLoaded: new Array(),
	myThumbs2: new Array(),
	stopLoading: null,
	scroll: null,
	scrollThumbs: null,
	title: null,
	reqPos: null,
	url: null,
	preCounter: null,
	log: new Array(),

	// Opzioni e inizializzazione ------------------------------------------------------------------ 
	options: {
		buffer: 5,
		interval: 4000,
		flip: false,		
		id: null,
		mode: 'photoset',
		limit: '',
		tags: '',
		sort: 'date-posted-desc',
		maxSize: 0,
		forceHeight: false,
		linkToFlickr: true,
		activateKeyboard: true,
		showTitle: true,
		showOwner: true,
		showButtons: true,
		showThumbnails: true,
		showMosaic: true,
		showFooter: true,
		showMosaicImmediately: false,
		bigMosaic: true,
		singleMode: false,
		playImmediately: true,
		centeringMargin: true,
		showLog: false,
		quickView: true
	},

	initialize: function(el, options){
		this.mainContainer = $(el);
		if(!this.mainContainer){
			this.log.push('Error: div ' + el + ' not found.');
			this.displayLog();
			return;
		}

		var root = './';
		
		// Registro le opzioni
		this.setOptions(options);

		// Carico i css	
		new Asset.css(root + '/inc/kishlery.css');

		// Normalizzo la dimensione
		if(this.options.maxSize)
			this.options.maxSize = this.options.maxSize.toInt();

		// Associo comportamenti alla finestra
		if(this.options.singleMode){
			window.addEvent('resize', function(){
				this.adaptToContainer(false);
				QuickView.cancel();
			}.bind(this));
		}
		
		// Cancello un eventuale quickview se scrollo
		window.addEvent('scroll', QuickView.cancel);

		// Registro l'eventuale posizione richiesta nell'url
		this.reqPos = document.location.hash.substr(1) * 1;

		// Chiamo il file xml
		var self = this;
		this.url = root + '/inc/kishlery.php';

		new Request.JSONP({
//			log: true,
			url: this.url,
			data: {
				id: this.options.id,
				per_page: this.options.limit,
				mode: this.options.mode,
				tags: this.options.tags,
				sort: this.options.sort
			},
			onComplete: function(json){
//				console.log(json);
				self.nextStep(json);
			}
		}).send();
	},

	nextStep: function(json){
		if(!json) return;
		var obj = this;
		
		var randOrd = function(){
			return (Math.round(Math.random()) - 0.5);
		}

		// Registro il log
		this.log = json.log;

		// Recupero i nodi in base alla modalità scelta
		switch(this.options.mode){
			case 'photoset':
				if(!json.photoset){
					obj.log.push('Error: ' + json.message);
					obj.displayLog();
					return;
				}
				
				this.nodes = json.photoset.photo;
				this.owner_id = json.photoset.owner;
				this.ownername = json.photoset.ownername;
				break;
			case 'user':
				if(!json.photos){
					obj.displayLog();
					return;
				}
				
				if(json.photos.total.toInt() == 0){
					obj.log.push('Error: no pictures found.');
					obj.displayLog();
					return;
				}

				this.nodes = json.photos.photo;
				this.owner_id =	json.photos.photo[0].owner;
				this.ownername = this.options.id;
				break;
			case 'group':
				if(!json.photos){
					obj.displayLog();
					return;
				}
				
				if(!json.photos.total){
					obj.log.push('Error: no pictures found.');
					obj.displayLog();
					return;
				}

				this.nodes = json.photos.photo;
				break;
			case 'folder':
				if(!json.photos){
					obj.displayLog();
					return;
				}
					
				this.nodes = json.photos.photo;
				this.options.linkToFlickr = false;
				break;
		}

		// Creo l'html
		this.doHTML();

		// Randomizzo l'ordine dei nodi se richiesto nelle opzioni
		if(this.options.sort == 'random')
			this.nodes.sort(randOrd);
	
		if(this.nodes.length <= this.options.buffer)
			this.options.buffer = this.nodes.length;

		// Controlli da tastiera
		this.keyboardControls();

		// Scrolling delle immagini principali
		this.scroll = new Fx.Scroll(this.picsContainer, {
			wait: false,
			duration: 800,
			transition: Fx.Transitions.Quint.easeInOut
		});

		// Scrolling automatico (play)
		if(this.options.singleMode){
			this.play = new Slideshow2(this.picsContainer);
		}
		else{
			this.play = new Slideshow(this.picsContainer, {
				wait: true,
				transition: Fx.Transitions.linear,
				onStart: function(){
					if(obj.buttons)
						obj.buttons.getElement('.KLplay').addClass('pause');
				},
				onComplete: function(){
					if(obj.buttons)
						obj.buttons.getElement('.KLplay').removeClass('pause');
				},
				onCancel: function(){
					if(obj.buttons)
						obj.buttons.getElement('.KLplay').removeClass('pause');
				}
			});
		}

		// Carico le immagini
		this.load(0);
	},

	doHTML: function(){

		// Loading bar
		this.preCounter = new Element('span').addClass('KLpre_counter').set('html', '<span>Loading...</span>').inject(this.mainContainer);

		// Container delle immagini
		this.picsContainer = new Element('div').addClass('KLpics_container');
		if(this.options.singleMode){
			var self = this;
			this.picsContainer.set('morph', {onComplete: function(){
				self.myPictures[self.current].tween('opacity', 1);
			}});
			this.mainContainer.addClass('KLsingle_mode');
		}
		if(this.options.maxSize)
			this.picsContainer.setStyle('height', this.options.maxSize + 'px');
		this.picsContainer.inject(this.mainContainer);

		// Dashboard
		this.dashboard = new Element('div').addClass('KLdashboard').inject(this.mainContainer);	

		// Titolo
		this.createTitle();

		// Bottoni
		this.createButtons();

		// Thumbnails
		this.createThumbnails();
		this.createMosaic();
		
		// Footer
		this.createFooter();
	},

	createTitle: function(){
		if(!this.options.showTitle) return;
		
		this.title = new Element('div').addClass('KLtitle').inject(this.dashboard);
		
		// Link a flickr o titolo senza link
		if(this.options.linkToFlickr)
			new Element('a', {href: '#', target: '_blank'}).addClass('KLtitleText').set('html', '&nbsp;').inject(this.title);
		else
			new Element('span').addClass('KLtitleText').inject(this.title).set('html', '&nbsp;');

		// Autore
		if(this.options.showOwner){
			var div = new Element('div').addClass('KLinfo').inject(this.title);
			if(this.options.linkToFlickr)
				new Element('a', {href: '#', target: '_blank'}).set('html', '&nbsp;').inject(div);
			else
				new Element('span').set('html', '&nbsp;').inject(div);
		}
	},

	setTitle: function(){
		if(!this.options.showTitle) return;
		
		// Recupero l'immagine corrente
		var currentPic = this.myPictures[this.current];
		if(!currentPic) return false;
		
		// Recupero i dettagli dell'immagine corrente (url e stringhe varie)
		if(this.options.mode == 'folder')
			var urls = this.getPicUrlFromFolder(this.nodes[this.current]);
		else
			var urls = this.getPicUrl(this.nodes[this.current]);

		// Rimepio gli spazi
		var t = this.title.getElement('.KLtitleText');
		t.set('text', currentPic.alt);
		if(this.options.linkToFlickr && urls[2])
			t.href = urls[2];

		if(this.options.showOwner && urls[3]){
			var i = this.title.getElement('.KLinfo');
			i.getFirst().set('html', urls[3]);
			if(this.options.linkToFlickr && urls[4])
				i.getFirst().href = urls[4];
		}
	},
	
	createButtons: function(){
		if(!this.options.showButtons) return;
		
		this.buttons = new Element('div').addClass('KLbuttons').inject(this.dashboard);

		// Bottone back
		new Element('a', {'href': './', 'title': 'Previous image'})
			.addClass('KLback')
			.addClass('button')
			.inject(this.buttons)
			.addEvent('click', function(){
				this.moveTo(this.current - 1);
				return false;
			}.bind(this));

		// Bottone play
		new Element('a', {'href': './', 'title': 'Start slideshow'})
			.addClass('KLplay')
			.addClass('button')
			.inject(this.buttons)
			.addEvent('click', function(){
				this.play.go(this);
				return false;
			}.bind(this));
		
		// Bottone forward
		new Element('a', {'href': './', 'title': 'Next image'})
			.addClass('KLnext')
			.addClass('button')
			.inject(this.buttons)
			.addEvent('click', function(){
				this.moveTo(this.current + 1);
				return false;
			}.bind(this));
			
		// Counter delle immagini
		var div = new Element('div')
			.addClass('KLcounter')
			.set('html', '<span>0/' + this.nodes.length + '</span>')
			.inject(this.buttons)
			.addEvent('click', function(){
				this.toggleLoading();
			}.bind(this));
			
		// Bottone per mostrare tutte le thumb
		if(this.options.showMosaic){
			new Element('a', {'href': './', 'title': 'Toggle Thumbs'})
				.addClass('KLthumbs_switcher')
				.addClass('button')
				.inject(this.buttons)
				.addEvent('click', function(){
					this.toggleMosaic();
					return false;
				}.bind(this));
		}
	},
	
	createThumbnails: function(){
		if(!this.options.showThumbnails) return;
		
		this.thumbnails = new Element('div').addClass('KLthumbnails').inject(this.dashboard);

		// Creo il contenitore delle thumb e la relativa animazione
		this.thumbsContainer = new Element('div').addClass('KLthumbsContainer');
		this.scrollThumbs = new Fx.Scroll(
			this.thumbsContainer,
			{
				wait: false,
				duration: 1000,
				transition: Fx.Transitions.Quint.easeInOut
			}
		);
		
		// Creo l'animazione
		var scrollAnimation = new Fx.Scroll(this.thumbsContainer, {transition: Fx.Transitions.Quint.easeInOut});

		// Bottone per scorrere indietro
		var a = new Element('a', {'href': './'})
			.addClass('KLthumbs_back')
			.inject(this.thumbnails)
			.addEvent('click', function(){
				scrollAnimation.start(this.thumbsContainer.scrollLeft - 1 * this.thumbsContainer.getWidth());
				return false;
			}.bind(this));

		// Appendo il contenitore delle thumb
		this.thumbsContainer.inject(this.thumbnails);
		
		// Bottone per scorrere avanti
		var a = new Element('a', {'href': './'})
			.addClass('KLthumbs_forward')
			.inject(this.thumbnails)
			.addEvent('click', function(){
				scrollAnimation.start(this.thumbsContainer.scrollLeft + 1 * this.thumbsContainer.getWidth());
				return false;
			}.bind(this));
	},
	
	createMosaic: function(){
		if(!this.options.showMosaic) return;
		
		var self = this;
		
		this.mosaic = new Element('div').addClass('KLmosaic').setOpacity(0).set('html', '<div></div>').inject(this.mainContainer);
		this.mosaic.set('tween', {onComplete: function(el){
			if(el.getStyle('opacity') == 0)
				el.setStyle('display', 'none');
		}});
	},
	
	createFooter: function(){
		if(!this.options.showFooter) return;
	
		new Element('div').addClass('KLfooter').set('html', 'powered by <a href="http://www.kishlery.com/" target="_blank">kishlery.com</a> + <a href="http://www.mootools.net/" target="_blank">mootools</a>').inject(this.mainContainer, 'after');
	},
	
	keyboardControls: function(){
		if(!this.options.activateKeyboard) return;
		
		document.addEvent('keydown', function(event){
			var event = new Event(event);
			switch(event.key){
				case 'right':
					this.moveTo(this.current + 1);
					break;
				case 'left':
					this.moveTo(this.current - 1);
					break;
				case 'space':
					QuickView.show(this);
					event.preventDefault();
					break;
				case 'enter':
					this.play.go(this);
					break;
				case 'esc':
					this.toggleLoading();
					QuickView.hide();
					break;
			}
		}.bind(this));
	},

	load: function(i){
		// Fine del caricamento
		if(i >= this.nodes.length || this.stopLoading){
			if(this.reqPos)
				this.moveTo(this.reqPos);

			return;
		}
		
		// Mostro l'indicatore di caricamento durante il buffering
		if(i < this.options.buffer){
			var width = 200 * (i + 1) / this.options.buffer;
			if(this.preCounter)
				this.preCounter.getElement('span').setStyle('width', width + 'px');
		}
		
		// Mostro le prime foto caricate
		if(i + 1 == this.options.buffer)
			this.openCurtains();

		// Precarico thumb e immagine
		if(this.options.mode == 'folder')
			var urls = this.getPicUrlFromFolder(this.nodes[i]);
		else
			var urls = this.getPicUrl(this.nodes[i]);

		this.loadPic(urls, i);	
	},

	getPicUrl: function(node){
		if(node.owner && (this.options.mode == 'photoset' || this.options.mode == 'group')){
			this.owner_id = node.owner;
			this.ownername = node.ownername?node.ownername:null;
		}
		
		return new Array(
			'http://farm' + node.farm + '.static.flickr.com/' + node.server + '/' + node.id + '_' + node.secret + '.jpg', // Image
			'http://farm' + node.farm + '.static.flickr.com/' + node.server + '/' + node.id + '_' + node.secret + '_s.jpg', // Thumb
			'http://www.flickr.com/photos/' + this.owner_id + '/' + node.id + '/', // Link all'immagine
			this.ownername, // Owner name
			'http://www.flickr.com/photos/' + this.owner_id + '/' // Link all'autore
		);
	},
	
	getPicUrlFromFolder: function(node){
		return new Array(
			node.url, // Image
			node.thumb, // Thumb
			null, // Link all'immagine
			node.author, // Owner name
			null // Link all'autore
		);
	},

	loadPic: function(urls, i){
		var obj = this;

		obj.myPictures[i] = new Asset.image(urls[0], {
			alt: obj.nodes[i].title,
			onload: function(){
				if(obj.isPicLoaded[i]) return false;
				
				var w = this.width;
				var h = this.height;
				
				// Ridimensionamento dell'immagine
				if(obj.options.maxSize){
					if(obj.options.forceHeight){
						// L'altezza viene forzata al valore specificato
						var max = this.height > obj.options.maxSize?obj.options.maxSize:this.height;
						w = (this.width * max / this.height).round();
						h = max;					
					}
					else{
						// Il lato più lungo prende il valore specificato se non eccede le dimensioni originali
						if(this.width > this.height){
							var max = this.width > obj.options.maxSize?obj.options.maxSize:this.width;
							w = max;
							h = (this.height * max / this.width).round();
						}
						else{
							var max = this.height > obj.options.maxSize?obj.options.maxSize:this.height;
							w = (this.width * max / this.height).round();
							h = max;
						}
					}
					
					this.setStyles({'width': w, 'height': h});
				}

				if(obj.options.singleMode)
					this.setStyle('opacity', 0);
				
				// Creo lo spazio iniziale e finale per fare in modo che la prima e l'ultima
				// immagine restino comunque centrate
				if(obj.options.singleMode) obj.options.centeringMargin = true;
				if(obj.options.centeringMargin){
					var m = obj.mainContainer.getWidth() / 2 - w / 2;
					
					if(i == 0)
						this.setStyle('marginLeft', m);

					if(i == obj.nodes.length - 1)
						this.setStyle('marginRight', m);
				}

				// Scroll verso questa immagine
				this.addEvent('click', function(){obj.moveTo(i);});

				obj.isPicLoaded[i] = true;
				
				if(obj.options.mode == 'folder')
					obj.isPicChecked[i] = 2;
				else
					obj.isPicChecked[i] = false;

				// Carico le thumbs relative
				obj.loadThumb(urls, i);
			}
		});
	},

	loadThumb: function(urls, i){
		var obj = this;
		
		return new Asset.image(urls[1], {
			alt: obj.nodes[i].title,
			onload: function(){
				if(obj.isThumbLoaded[i]) return false;
	
				// Prima thumb
				if(obj.thumbnails){
					obj.myThumbs[i] = this;
					obj.myThumbs[i].addEvent('click', function(){
						obj.moveTo(i);
					});
					
					// Seleziono se è la prima thumb
					if(i == 0) obj.myThumbs[i].addClass('KLselected');
				}
				
				// Seconda thumb
				if(obj.mosaic){
					obj.myThumbs2[i] = this.clone();
					obj.myThumbs2[i].addEvent('click', function(){
						obj.moveTo(i);					
					});
					
					// Seleziono se è la prima thumb
					if(i == 0) obj.myThumbs2[i].addClass('KLselected');
				}

				// Mostro il numero di foto caricate
				obj.updateCounter(i);

				obj.isThumbLoaded[i] = true;
				
				// Scrivo le immagini
				obj.injectImages(urls, i);

				// Carico la prossima immagine
				obj.load(i + 1);				
			}
		});
	},

	injectImages: function(urls, i){
		// Scrivo l'immagine
		this.myPictures[i].inject(this.picsContainer);

		// Scrivo le thumbs e le faccio apparire
		if(this.thumbnails){
			this.myThumbs[i].setOpacity(0).inject(this.thumbsContainer);
			this.myThumbs[i].tween('opacity', 1);
		}
		if(this.mosaic){
			this.myThumbs2[i].inject(this.mosaic.getElement('div'));
			this.myThumbs2[i].tween('opacity', 1);
		}
	},

	toggleLoading: function(){
		if(this.myThumbs2.length < this.buffer) return false;
		
		var span = this.buttons.getElement('.KLcounter');
		if(this.stopLoading){
			span.removeClass('KLstopped');
			this.stopLoading = null;
			this.load(this.myThumbs2.length);
		}
		else{
			span.addClass('KLstopped');
			this.stopLoading = true;
		}
	},
	
	adaptToContainer: function(animation, postActions){
		if(!this.mainContainer) return false;
		
		// Occupo tutto lo spazio consentito dal contenitore
		var p = this.mainContainer.getParent();
		var h = p.getHeight();

		h -= p.getStyle('margin-top').toInt();
		h -= p.getStyle('margin-bottom').toInt();
		h -= this.mainContainer.getStyle('margin-top').toInt();
		h -= this.mainContainer.getStyle('margin-bottom').toInt();
		p.getChildren().each(function(el){
			if(el.hasClass('KLmainContainer')) return;
			
			if(el.getStyle('position') == 'absolute') return;
			
			if(el.getStyle('margin-top').toInt() > 0)
				h -= el.getStyle('margin-top').toInt();
			if(el.getStyle('margin-bottom').toInt() > 0)
				h -= el.getStyle('margin-bottom').toInt();
				
			h -= el.getHeight();
		});
		
		if(animation){
			this.mainContainer.set('tween', {onComplete: function(){
				postActions();
			}});
			this.mainContainer.tween('height', h);
		}
		else
			this.mainContainer.setStyle('height', h);
	},

	updateCounter: function(i){
		if(!this.options.showButtons) return;

		var c = this.mainContainer.getElement('.KLcounter span');
		var percentage = (i + 1) * 100 / this.nodes.length;

		c.set('html', (i + 1) + '/' + this.nodes.length + '&nbsp;').setStyle('width', percentage + 'px');
		
		// Faccio sparire il counter delle immagini quando ho finito
		if(percentage >= 100){
			percentage = 100;
			this.mainContainer.getElement('.KLcounter').tween('opacity', 0);
		}
	},

	openCurtains: function(){
		var self = this;

		if(this.preCounter){
			this.preCounter.set('tween', {
				onComplete: function(){
					self.preCounter.destroy();
					self.preCounter = null;
				}
			});
			this.preCounter.tween('opacity', 0);
		}
		
		this.mainContainer.set('tween', {
			duration:1000,
			transition: Fx.Transitions.Quint.easeInOut,
			onComplete: function(){
				self.openCurtains2();
			}
		});
		this.mainContainer.tween('height', 0);

	},
	
	openCurtains2: function(){
		var self = this;
		
		// Faccio comparire tutto
		this.dashboard.setStyle('display', 'block');
		this.picsContainer.setStyle('display', 'block');

		var postActions = function(){
			if(self.options.showMosaicImmediately)
				self.toggleMosaic();							// Mostro il mosaic immediatamente

			if(self.options.playImmediately)
				(function(){self.play.go(self);}).delay(1000);	// Faccio partire lo slideshow
		}

		if(this.options.singleMode){
			this.picsContainer.setStyles({width: 50, height: 0, marginTop: 10});
			this.adaptToContainer(true, postActions);
		}
		else if(this.options.forceHeight && this.options.maxSize){
			var h = this.options.maxSize + this.dashboard.getHeight();
			h += this.dashboard.getStyle('margin-top').toInt();
			
			this.mainContainer.set('tween', {onComplete: postActions});
			this.mainContainer.tween('height', h);
		}
		else{
			this.mainContainer.setStyle('height', 'auto');

			postActions();
		}

		// Seleziono la prima foto (delay per Opera che ha problemi...)
		if(!this.reqPos)
			(function(){this.moveTo(0);}).delay(500, this);
		
		// Mostro gli eventuali errori
		this.displayLog();
	},

	moveTo: function(num, periodical){
		if(!this.play) return;

//		window.location.hash = num;

		// Interrompo il play automatico
		if(!periodical) this.play.cancel();

		// Chiudo l'eventuale pannello thumb
		this.closeMosaic();

		// Determino l'immagine desiderata
		if(num < 0) num = 0;
		var pic = this.myPictures[num];
		if(!pic){
			this.play.cancel();
			return;
		}
		
		if(this.options.quickView){
			var prev = this.picsContainer.getElement('.current');
			if(prev)
				prev.removeClass('current');
			pic.addClass('current');
		}

		this.previous = this.current;
		this.current = num;

		// Se clicco sulla corrente, non faccio niente ed esco
		if(this.previous == this.current){
			QuickView.show(this);
			return;
		}
		
		// Svuoto l'eventuale largeDiv
		QuickView.cancel();

		// Seleziono il bottone su cui ho cliccato
		this.selectButton(num);	

		// Mostro il titolo
		this.setTitle();

		// Scelgo il tipo di animazione	e avvio
		if(this.options.singleMode)
			this.singleMotion(pic);
		else
			this.slideMotion(pic);
	},

	singleMotion: function(pic){
		// Nascondo la precedente
		if(this.myPictures[this.previous])
			this.myPictures[this.previous].setOpacity(0);

		// Scrollo al punto in cui inizia la nuova immagine
		var amount = pic.getPosition(this.picsContainer).x - 1;
		if(Browser.Engine.presto)
			pic.addClass('opera');
		this.scroll.set(amount, 0);

		// Calcolo il marginTop che l'immagine deve avere rispetto al contenitore
		var viewport = this.mainContainer.getHeight() - this.dashboard.getHeight();
		var marginTop = (viewport - pic.getHeight()) / 2 ;
		
		// Avvio l'animazione
		this.picsContainer.morph({
			height: pic.getHeight(),
			width: pic.getWidth(),
			marginTop: marginTop
		});
	},

	slideMotion: function(pic){
		var w = this.picsContainer.getWidth();
		var offset = pic != this.picsContainer.getLast()?(w - pic.getWidth()) / 2:0;
	
		// Avvio l'animazione
		this.scroll.options.offset.x = -offset;
		var amount = pic.offsetLeft;
		this.scroll.start(amount);
	},

	selectButton: function(num){
		var thumb = this.myThumbs[num];
		var thumb2 = this.myThumbs2[num];

		// Seleziono il thumb1 corrente
		if(thumb){
			if(this.thumbsContainer.getElement('.KLselected'))
				this.thumbsContainer.getElement('.KLselected').removeClass('KLselected');
			thumb.addClass('KLselected');
		}

		// Seleziono il thumb2 corrente
		if(thumb2){
			if(this.mosaic.getElement('.KLselected'))
				this.mosaic.getElement('.KLselected').removeClass('KLselected');
			thumb2.addClass('KLselected');
		}

		// Calcolo la posizione della thumb e l'offset
		if(this.thumbnails){
			var amount = thumb.offsetLeft - this.thumbsContainer.getWidth() / 2 + thumb.getWidth() / 2;
	
			// Faccio partire l'animazione
			this.scrollThumbs.start(amount);
		}
	},

	toggleMosaic: function(){
		if(!this.mosaic) return;
		
		if(this.mosaic.getStyle('opacity') > 0)
			this.closeMosaic();
		else{
			// Recupero le dimensioni corrette per il mosaic
			var el = this.options.bigMosaic ? this.mainContainer : this.picsContainer;
			
			// Interrompo un eventuale slideshow
			this.play.cancel();

			// Mostro il mosaic
			this.mosaic.setStyles({height: el.getHeight(), opacity: 0, display: 'block'});
			this.mosaic.tween('opacity', .9);
		}
	},
	
	closeMosaic: function(){
		if(!this.mosaic) return;

		if(this.mosaic.getStyle('opacity') == 0) return;

		this.mosaic.tween('opacity', 0);
	},
	
	urldecode: function(str){
		str = unescape(str);
		str = str.replace(/\+/g,' ');
	//	str = str.replace(/\*/g, '%2A');
	//	str = str.replace(/\//g, '%2F');
	//	str = str.replace(/@/g, '%40');
		
		return str;
	},

	displayLog: function(txt){
		var self = this;
		var error_html = '';
		var displayErrors = false;

		// Esamino il log e separo gli errori dai notice
		self.log.each(function(txt){
			var t = self.urldecode(txt);
			if(t.contains('Error:')){
				displayErrors = true;
				error_html += '<li>' + t + '</li>';
			}
			else if(self.options.showLog && typeof console != "undefined" && typeof console.log != "undefined"){
				// Mostro i notice in console, se richiesto
				console.log(t);
			}
		});
		
		if(!displayErrors) return;

		var error = new Element('div')
			.set('html', '<ul>' + error_html + '</ul>')
			.addClass('error')
			.setOpacity(0)
			.inject(this.mainContainer);
		
		// Ridimensiono il container principale se non è abbastanza alto per contenere i messaggi di errore
		if(error.getHeight() > this.mainContainer.getHeight()){
			self.mainContainer.tween('height', error.getHeight() + 20);
		}

		// Errore flottante o solitario...
		if(this.mainContainer.getChildren().length > 1)
			error.addClass('floating');

		// Mostro i messaggi di errore
		(function(){
			error.tween('opacity', .9);
		}).delay(500);
	}
});


// Quickview ---------------------------------------------------------------------------------------
var QuickView = {
	div: null,
	mask:null,
	oldCoors: null,
	obj:null,

	show: function(obj){
		if(!obj.options.quickView) return;

		if(!obj.current) obj.current = 0;

		if(this.div)
			return this.hide();

		this.obj = obj;

		var scroll = window.getScroll();

		this.mask = new Element('div')
			.addClass('KLmask')
			.setOpacity(0)
			.setStyles({top:scroll.y, left:scroll.x})
			.inject(document.body);
		this.mask.tween('opacity', .7);

		this.div = new Element('div')
			.addClass('KLquickView')
			.addEvent('click', this.hide)
			.inject(document.body);
				
		// Determino quanto spazio ho a disposizione
		var winSize = window.getSize();
		var margin = 120;
		var max = 1024;
		var maxWinWidth = winSize.x - margin > max?max:winSize.x - margin;
		var maxWinHeight = winSize.y - margin > max?max:winSize.y - margin;
		
		// Recupero le dimensioni dell'immagine corrente
		var pic = obj.myPictures[obj.current];
		var picH = pic.getHeight();
		var picW = pic.getWidth();

		// Clono l'immagine corrente dentro il div contenitore
		pic.clone().addClass('clone').inject(this.div);

		// Posiziono il div contenitore sopra l'immagine corrente
		this.oldCoors = pic.getCoordinates();
		this.div.setStyles(this.oldCoors);
		this.div.setStyle('display', 'block');

		// Determino le dimensioni della nuova immagine più grande
		if(picW > picH){
			// Landscape
			var w = maxWinWidth;
			var h = (picH * w / picW).round();
			
			if(h > maxWinHeight){
				h = maxWinHeight;
				w = (picW * h / picH).round();
			}
		}
		else{
			// Portrait
			var h = maxWinHeight;
			var w = (picW * h / picH).round();
			
			if(w > maxWinWidth){
				w = maxWinWidth;
				h = (picH * w / picW).round();
			}
		}
		
		if(h < picH) h = picH + 50;
		if(w < picW) w = picW + 50;
		
		// Calcolo il top e left nuovi
		var t = (winSize.y / 2 - h / 2) + scroll.y;
		var l = (winSize.x / 2 - w / 2) + scroll.x;

		// Ingrandisco il div in base alle nuove dimensioni
		this.div.set('morph', {duration:500, transition: Fx.Transitions.Quint.easeInOut});
		this.div.morph({
			height: h,
			width: w,
			top: t,
			left: l
		});
	
		// Carico l'immagine grande e la incollo nel div
		this.loadLargeImage();
	},
	
	loadLargeImage: function(){
		var self = this;
		var node = this.obj.nodes[this.obj.current];
		var url = 'http://farm' + node.farm + '.static.flickr.com/' + node.server + '/' + node.id + '_' + node.secret + '_b.jpg';
		var isChecked = self.obj.isPicChecked[self.obj.current];
		self.div.addClass('loading');

		var card = new Element('div')
			.addClass('card')
			.addEvent('click', this.flip)
			.inject(this.div);

		// Loading gif
		new Element('div').addClass('loader').inject(self.div);
		
		// Verifico che l'immagine grande esista
		if(isChecked == 1){
			// Già controllata ed esiste, la carico senza problemi
			this.loadImage(url, node, card);
		}
		else if(isChecked == 2){
			// Già controllata e non esiste, lascio la versione piccola
			self.div.addClass('notFound');
			return;
		}
		else{
			// Non è stata ancora controllata, verifico
			new Request.JSONP({
				url: this.obj.url,
				data: {
					mode: 'checkImage',
					url: url
				},
				onComplete: function(txt){
					// L'immagine grande non esiste, lascio quella piccola ed esco
					if(txt != 1){
						self.div.addClass('notFound');
						self.obj.isPicChecked[self.obj.current] = 2;
						return;
					}
					
					self.obj.isPicChecked[self.obj.current] = 1;
	
					// L'immagine grande esiste e la carico
					self.loadImage(url, node, card);
				}
			}).send();
		}
	},
	
	loadImage: function(url, node, card){
		var self = this;
		
		new Asset.image(url, {
			alt: node.title,
			onload: function(){
				if(!self.div) return;

				self.div.removeClass('loading');
			}
		}).addClass('front').inject(card);

		// Creo il retro della carta
		if(this.obj.options.flip)
			new Element('div').addClass('back').set('html', 'Qualcosa da scrivere...').inject(card);
	},

	hide: function(){
		if(!QuickView.div) return;

		QuickView.div.set('morph', {
			duration:500,
			transition: Fx.Transitions.Quint.easeInOut,
			onComplete: function(){
				if(QuickView.div){
					QuickView.div.destroy();
					QuickView.div = null;
				}				
			}
		});
		QuickView.div.morph(QuickView.oldCoors);
		
		QuickView.mask.set('tween', {
			onComplete: function(){
				if(QuickView.mask){
					QuickView.mask.destroy();
					QuickView.mask = null;
				}
			}
		});
		QuickView.mask.tween('opacity', 0);
	},
	
	cancel: function(){
		if(QuickView.div){
			QuickView.div.destroy();
			QuickView.div = null;
		}

		if(QuickView.mask){
			QuickView.mask.destroy();
			QuickView.mask = null;
		}
	},
	
	flip: function(e){
		if(!QuickView.obj.options.flip) return;

		e.stopPropagation();
		
		var div = QuickView.div.getElement('.card');
		if(div.hasClass('flipped'))
			div.removeClass('flipped');
		else
			div.addClass('flipped');
	}
}


// Slideshow ---------------------------------------------------------------------------------------
var Slideshow = new Class({
	
	Extends: Fx.Scroll,

	pxs: 60,
	parentObj: null,
	
	go: function(obj){
		this.parentObj = obj;
		
		if(!this.parentObj.picsContainer) return;

		// Chiudo l'eventuale pannello thumb
		this.parentObj.closeMosaic();

		// Stop
		if(this.timer){
			this.cancel();
			return false;
		}

		// Riavvolgo se sono all'ultima immagine
		if(this.parentObj.current == this.parentObj.myPictures.length - 1){
			this.parentObj.scroll.chain(function(){this.go(this.parentObj);}.bind(this));
			this.parentObj.moveTo(0);
			return false;
		}
		
		var from = this.parentObj.picsContainer.scrollLeft + this.parentObj.picsContainer.getWidth();
		var to = this.parentObj.picsContainer.scrollWidth;
		var duration = ((to - from) / this.pxs * 1000).round();
		
		// Faccio partire l'animazione
		this.options.duration = duration;
		this.start(to);
	},
	
	step: function(){
		var time = $time();
		var now = this.parentObj.picsContainer.scrollLeft + this.parentObj.picsContainer.getWidth();
		var next = this.parentObj.myPictures[this.parentObj.current + 1];

		if(next && now >= next.offsetLeft + next.getWidth()){
			this.parentObj.current++;
			this.parentObj.selectButton(this.parentObj.current);
			this.parentObj.setTitle();
		}

		if (time < this.time + this.options.duration){
			var delta = this.options.transition((time - this.time) / this.options.duration);
			this.set(this.compute(this.from, this.to, delta));
		}
		else{
			this.set(this.compute(this.from, this.to, 1));
			this.complete();
			this.parentObj.selectButton(this.parentObj.current);
		}
	}
});


// Slideshow 2 -------------------------------------------------------------------------------------
var Slideshow2 = new Class({
	timer: null,
	parentObj: null,
	interval: 5000,
	
	go: function(obj){
		this.parentObj = obj;
		this.interval = obj.options.interval < 1000 ? 1000 : obj.options.interval;
		
		if(!this.parentObj.picsContainer) return;
		
		// Stop
		if(this.timer){
			this.cancel();
			return false;
		}

		this.move();
		
		if(!this.timer){
			this.parentObj.buttons.getElement('.KLplay').addClass('pause');
			this.timer = this.move.periodical(this.interval, this);
		}
	},
	
	move: function(){
		this.parentObj.moveTo(this.parentObj.current + 1, true);
	},
	
	cancel: function(){
		if(!this.parentObj) return false;
		$clear(this.timer);
		this.timer = null;
		this.parentObj.buttons.getElement('.KLplay').removeClass('pause');
	}
});