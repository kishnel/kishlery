<?php
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
if(isset($_GET['id'])){
	$mode = isset($_GET['mode'])?$_GET['mode']:'photoset';
	$id = isset($_GET['id'])?$_GET['id']:72057594096459350;
	$limit = isset($_GET['limit']) && is_numeric($_GET['limit'])?$_GET['limit']:30;
	$tags = isset($_GET['tags'])?$_GET['tags']:'';
	$maxSize = isset($_GET['maxSize'])?$_GET['maxSize']:'';
	$forceHeight = isset($_GET['forceHeight'])?true:false;
	$linkToFlickr = isset($_GET['linkToFlickr'])?true:false;
	$showOwner = isset($_GET['showOwner'])?true:false;
	$showTitle = isset($_GET['showTitle'])?true:false;
	$showButtons = isset($_GET['showButtons'])?true:false;
	$showThumbnails = isset($_GET['showThumbnails'])?true:false;
	$showMosaic = isset($_GET['showMosaic'])?true:false;
	$showMosaicImmediately = isset($_GET['showMosaicImmediately'])?true:false;
	$activateKeyboard = isset($_GET['activateKeyboard'])?true:false;
	$singleMode = isset($_GET['singleMode'])?true:false;
	$sort = isset($_GET['sort'])?$_GET['sort']:'date-posted-desc';
	$playImmediately = isset($_GET['playImmediately'])?true:false;
	$centeringMargin = isset($_GET['centeringMargin'])?true:false;
	$showLog = isset($_GET['showLog'])?true:false;
	$quickView = isset($_GET['quickView'])?true:false;
	$bigMosaic = isset($_GET['bigMosaic'])?true:false;
	$showFooter = isset($_GET['showFooter'])?true:false;
}
else{
	$mode = 'user'; // photoset, user, group, folder
	$id = 'carodani';
	$limit = 30;
	$tags = '';
	$maxSize = '300';
	$forceHeight = true;
	$linkToFlickr = true;
	$showOwner = true;
	$showTitle = true;
	$showButtons = true;
	$showThumbnails = true;
	$showMosaic = true;
	$showMosaicImmediately = false;
	$activateKeyboard = true;
	$singleMode = false;
	$sort = 'date-posted-desc';
	$playImmediately = false;
	$centeringMargin = true;
	$showLog = false;
	$quickView = true;
	$bigMosaic = true;
	$showFooter = true;
}

// Modes -------------------------------------------------------------------------------------------
$modes = array(
	'photoset' => 'Photoset',
	'user' => 'User',
	'group' => 'Group'/*,
	'folder' => 'Local folder'*/
);

$modes_html = '';
foreach($modes as $m => $t){
	$checked = ($mode == $m)?' checked="checked"':'';
	$modes_html .= '
	<label>
		<input type="radio" name="mode" value="'.$m.'" onclick="switchMode(\''.$m.'\')"'.$checked.' />
		'.$t.'
	</label>
	';
}

// Params ------------------------------------------------------------------------------------------
$sortOptions = array(
	'date-posted-asc' => 'Date Ascendent',
	'date-posted-desc' => 'Date Descendent',
	'interestingness-desc' => 'Interestingness Descendent',
	'interestingness-asc' => 'Interestingness Ascendent',
	'date-taken-desc' => 'Date Taken',
	'relevance' => 'Relevance',
	'random' => 'Random'
);
$params = array(
	'id' => array('description' => 'Flickr photoset id:', 'type' => 'text'),
	'limit' => array('description' => 'Number of pictures:', 'type' => 'text'),
	'tags' => array('description' => 'Tags:', 'type' => 'text'),
	'maxSize' => array('description' => 'Max edge size:', 'type' => 'text'),
	'forceHeight' => array('description' => 'force height to this size', 'type' => 'checkbox', 'class' => 'indented'),
	'sort' => array('description' => 'Order:', 'type' => 'select', 'options' => $sortOptions),
	'showTitle' => array('description' => 'Display title:', 'type' => 'checkbox'),
	'linkToFlickr' => array('description' => 'link to Flickr', 'type' => 'checkbox', 'class' => 'indented'),
	'showOwner' => array('description' => 'display photographer name', 'type' => 'checkbox', 'class' => 'indented'),
	'showButtons' => array('description' => 'Display buttons bar:', 'type' => 'checkbox'),
	'showMosaic' => array('description' => 'display mosaic button', 'type' => 'checkbox', 'class' => 'indented'),
	'showMosaicImmediately' => array('description' => 'show mosaic immediately', 'type' => 'checkbox', 'class' => 'indented'),
	'bigMosaic' => array('description' => 'mosaic covers everything', 'type' => 'checkbox', 'class' => 'indented'),
	'showThumbnails' => array('description' => 'Display thumbnails:', 'type' => 'checkbox'),
	'activateKeyboard' => array('description' => 'Activate keyboard controls:', 'type' => 'checkbox'),
	'singleMode' => array('description' => 'Single mode:', 'type' => 'checkbox'),
	'centeringMargin' => array('description' => 'Centering margins:', 'type' => 'checkbox'),
	'playImmediately' => array('description' => 'Automatic slideshow:', 'type' => 'checkbox'),
	'quickView' => array('description' => 'Quick View:', 'type' => 'checkbox'),
	'showLog' => array('description' => 'Display logs:', 'type' => 'checkbox'),
	'showFooter' => array('description' => 'Display credits:', 'type' => 'checkbox')
);

$params_html = '';
foreach($params as $p => $v){
	$class = $v['class'] ? ' class="'.$v['class'].'"' : '';
	
	$params_html .= '<label id="'.$p.'_label"'.$class.'>';
	$params_html .= '<span>'.$v['description'].'</span>';
	
	switch($v['type']){
		case 'select':
			$params_html .= '<select name="'.$p.'">';
			foreach($v['options'] as $k => $d){
				$selected = $k == $$p ? ' selected="selected"' : '';
				
				$params_html .= '<option value="'.$k.'"'.$selected.'>'.$d.'</option>';
			}
			$params_html .= '</select>';
			break;
		case 'checkbox':
			$params_html .= '<input type="checkbox" class="checkbox" name="'.$p.'"'.($$p?' checked="checked"':'').' />';
			break;
		default:
			$params_html .= '<input type="text" class="text" name="'.$p.'" value="'.$$p.'" />';
	}

	$params_html .= '</label>';
}

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="it">
<head>
	<title>Kishlery</title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
	<meta name="author" content="Marcello Mascia" />
	<meta name="title" content="Kishlery, a beautiful image gallery" />
	<meta name="keywords" content="gallery, flickr, api, javascript, ajax, images, immagini, mootools, slideshow, foto, fotografia, photoset, photography, flickr photo gallery, slideshow" />
	<meta name="description" content="a beautiful image gallery made with javascript and love" />
	<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/mootools/1.2.4/mootools-yui-compressed.js"></script>
	<script type="text/javascript" src="./inc/mootools-1.2.4.4-more.js"></script>
	<script type="text/javascript" src="./inc/kishlery.js"></script>
	<script type="text/javascript" src="./inc/homepage.js"></script>
	<script type="text/javascript">
		var currentMode = '<?php echo $mode; ?>';
	</script>
	<style type="text/css" media="all">
		@import url("./inc/styles.css");
	</style>
</head>
<body>
	
	<div class="header">
		<!-- Buttons -->
		<div class="links">
			<a href="./" onclick="Panel.open(); return false;">Get code</a>
			<a href="./" onclick="toggleSettings(this); return false;">Change settings</a>
		</div>
	</div>

	<form action="./" method="get" id="settings">
		<fieldset class="types">
			<legend>Mode</legend>
			<?php echo $modes_html; ?>
		</fieldset>
			
		<fieldset class="params">
			<legend>Params</legend>
			<?php echo $params_html; ?>			
		</fieldset>
		
		<input type="hidden" name="code" value="0" />
		<input type="submit" class="button" value="Update" />
	</form>

	<!-- The magic -->
	<div id="kishlery" class="KLmainContainer"></div>
	<script type="text/javascript">
		var myKishlery = new Kishlery('kishlery', {
			id: "<?php echo $id; ?>",
			limit: "<?php echo $limit; ?>",
			mode: "<?php echo $mode; ?>",
			tags: "<?php echo $tags; ?>",
			maxSize: "<?php echo $maxSize; ?>",
			forceHeight: "<?php echo $forceHeight; ?>",
			linkToFlickr: "<?php echo $linkToFlickr; ?>",
			showOwner: "<?php echo $showOwner; ?>",
			showTitle: "<?php echo $showTitle; ?>",
			showButtons: "<?php echo $showButtons; ?>",
			showThumbnails: "<?php echo $showThumbnails; ?>",
			showMosaic: "<?php echo $showMosaic; ?>",
			activateKeyboard: "<?php echo $activateKeyboard; ?>",
			singleMode: "<?php echo $singleMode; ?>",
			sort: "<?php echo $sort; ?>",
			showMosaicImmediately: "<?php echo $showMosaicImmediately; ?>",
			playImmediately: "<?php echo $playImmediately; ?>",
			centeringMargin: "<?php echo $centeringMargin; ?>",
			showLog: "<?php echo $showLog; ?>",
			quickView:  "<?php echo $quickView; ?>",
			bigMosaic:  "<?php echo $bigMosaic; ?>",
			showFooter: "<?php echo $showFooter; ?>"
		});
	</script>

</body>
</html>
