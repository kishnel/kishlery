var originalFrontHeight;

window.addEvent('load', function(){
	switchMode(currentMode);
	
	showFacebookPage();
});


function switchMode(s){
	var h = $('settings').getElement('.params label').getHeight();

	switch(s){
		case 'photoset':
			var text = 'Flickr photoset id:';

			$('tags_label').tween('height', 0);
			$('linkToFlickr_label').tween('height', h);
			$('sort_label').tween('height', 0);
			break;
		case 'user':
			var text = 'Nickname/NSID:';

			$('tags_label').tween('height', h);
			$('linkToFlickr_label').tween('height', h);
			$('sort_label').tween('height', h);
			break;
		case 'group':
			var text = 'Group name/NSID:';

			$('tags_label').tween('height', h);
			$('linkToFlickr_label').tween('height', h);
			$('sort_label').tween('height', 0);
			
			break;
		case 'folder':
			var text = 'Local folder path:';

			$('tags_label').tween('height', 0);
			$('linkToFlickr_label').tween('height', 0);
			$('sort_label').tween('height', 0);
			break;
	}	
	
	$('id_label').getElement('span').innerHTML = text;
//	$('settings').id.value = '';
}

function toggleSettings(button){
	var f = $('settings');
	var k = $('kishlery');
	if(k.getHeight() > 0) originalFrontHeight = k.getHeight();
	var cond = f.getHeight() == 0;

	var alternate = function(a, b, h){
		a.set('tween', {onComplete: null});
		b.set('tween', {
			duration:700,
			transition: Fx.Transitions.Quint.easeInOut,
			onComplete: function(){				
				a.tween('height', h);
				
				var txt = cond ? 'Hide settings':'Change settings';
				button.innerHTML = txt;
			}
		}).tween('height', 0);
	}

	if(cond){
		document.removeEvents('keydown');
		alternate(f, k, f.getScrollSize().y);
	}
	else{
		myKishlery.keyboardControls();
		alternate(k, f, originalFrontHeight);
	}
}

var Panel = {
	div: null,
	mask: null,
	
	open: function(){
		if(this.div)
			this.div.destroy();

		// Creo e mostro la maschera
		var scroll = window.getScroll();
		this.mask = new Element('div')
			.addClass('mask')
			.setOpacity(0)
			.setStyles({top:scroll.y, left:scroll.x})
			.addEvent('click', Panel.close)
			.inject(document.body)
			.tween('opacity', .7);
		
		// Creo il div contenitore della textarea
		this.div = new Element('div')
			.addClass('codeDiv')
			.set('tween', {
				duration:500,
				transition: Fx.Transitions.Quint.easeInOut
			})
			.inject(document.body);

		// Imposto il form in modo che recuperi il codice e non lo esegua
		$('settings').code.value = 1;

		// Richiedo al server il codice
		new Request({
			method: 'get',
			url: './inc/kishlery.php',
			onSuccess: function(html, xml){
				Panel.div.set('html', html);
				var s = Panel.div.getElement('textarea').getSize();
	
				Panel.div.setStyles({
					width: s.x + 20,
					top: -600,
					left: '50%',
					marginLeft: -(s.x + 20) / 2
				})
				.tween('top', 0);
				
				// Azzero il parametro magico del form...
				$('settings').code.value = 0;
			}
		}).send($('settings'));
	},
	
	close: function(){
		Panel.mask.tween('opacity', 0);
		Panel.div.tween('top', -600);
	},
	
	copy: function(){
//		alert('Cipio');
	}
}

function showFacebookPage(){
	$('facebookPage').tween('top', 50);
}