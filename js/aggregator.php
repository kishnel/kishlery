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

header("Content-type: text/javascript; charset=UTF-8");
require './jsmin.php';

// Array dei javascript da includere
$javascripts = array(
	'http://ajax.googleapis.com/ajax/libs/mootools/1.2.5/mootools-yui-compressed.js' => false,
	'../inc/mootools-1.2.4.4-more.js' => false,
	'../inc/kishlery.js' => true
);

$js = "// All-in-one for kishlery.com ". date("d/m/Y H:i:s") ."\n\n";

// Recupero e unisco i javascript
foreach($javascripts as $javascript => $compress)
{
	$file = file_get_contents($javascript);
	
	$js .= "// Here starts ".$javascript."\n\n";	
	$js .= $compress ? JSMin::minify($file) : $file;
	$js .= "\n\n";
}

// Salvo su file
if(1)
{
	$h = fopen('./global.js', 'w');
	fwrite($h, $js);
	fclose($h);
}

echo $js;
?>
