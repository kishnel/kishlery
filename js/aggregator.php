<?php
header("Content-type: text/javascript; charset=UTF-8");
require './jsmin.php';

// Array dei javascript da includere
$javascripts = array(
	'http://ajax.googleapis.com/ajax/libs/mootools/1.2.4/mootools-yui-compressed.js' => false,
	'../inc/mootools-1.2.4.4-more.js' => false,
	'../inc/kishlery.js' => true
);

$js = "// All-in-one for kishlery.com ". date("d/m/Y H:i:s") ."\n\n";

// Recupero e unisco i javascript
foreach($javascripts as $javascript => $compress){
	$file = file_get_contents($javascript);
	
	$js .= "// Here starts ".$javascript."\n\n";	
	$js .= $compress ? JSMin::minify($file) : $file;
	$js .= "\n\n";
}

// Salvo su file
if(1){
	$h = fopen('./global.js', 'w');
	fwrite($h, $js);
	fclose($h);
}

echo $js;
?>
