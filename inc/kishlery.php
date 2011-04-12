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

class Flickr{
	private	$api_key = ''; // get an API key from http://www.flickr.com/services/apps/create/apply/
	private $endpoint = 'http://api.flickr.com/services/rest/';
	private $connection_timeout = 20; // seconds
	private $io_timeout = 20; // seconds
	private $format = 'json';
	private $nojsoncallback = true;
	public $error;
	public $log = '';
	public $response;
	public $method;
	public $params = array();
	public $paramsString = '';
	public $cache = true;
	public $cache_dir = '../cache';
	public $cache_time = 600; // seconds
	
	public function __construct(){

	}
	
	public function call(){
		if(!$this->method)
			return;

		// Stringa dei parametri di base
		$this->paramsString = 'method='.$this->method;
		$this->paramsString .= '&api_key='.$this->api_key;
		$this->paramsString .= '&format='.$this->format;
		if($this->nojsoncallback)
			$this->paramsString .= '&nojsoncallback=1';

		// Aggiungo i parametri del metodo in questione
		foreach($this->params as $k => $v){
			$this->paramsString .= '&'.$k.'='.urlencode($v);
		}

		// Chiamo Flickr
		$this->curlRequest();
		
		return $this->response;
	}
	
	private function writeLog($string){
		$this->log .= $string."\n";
	}
	
	public function getLogForJSON(){
		$log = explode("\n", trim($this->log));
		for($i = 0; $i < count($log); $i++){
			$log[$i] = trim($log[$i]);
		}
		$log = '"' . implode('", "', $log) . '"';
		
		return $log;
	}
	
	private function curlRequest(){
		if($this->getCachedData())
			return;		
	
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $this->endpoint);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
		curl_setopt($ch, CURLOPT_HEADER, 0);
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $this->paramsString);
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $this->connection_timeout);
		curl_setopt ($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_TIMEOUT, $this->io_timeout);
		curl_setopt($ch, CURLOPT_BUFFERSIZE, 3);
		$this->response = curl_exec($ch);
		$this->error = curl_error($ch);
		curl_close($ch);
		$this->writeLog('PARAMS: '.$this->paramsString);
		// Scrivo il file in cache
		if($this->cache){
			$file = $this->cache_dir.'/'.$this->method.'_'.md5($this->paramsString);
			$h = fopen($file, 'w');
			fwrite($h, $this->response);
			fclose($h);
			$this->writeLog('Cache saved ('.$file.')');
		}
	
		return;
	}
	
	private function getCachedData(){
		// Se la cache  false, cancello ed esco
		if(!$this->cache){
			$this->writeLog('Cache disabled');
			return false;
		}

		// Controllo se esiste la directory di cache
		if(!is_dir($this->cache_dir)){
			$this->cache = false;
			$this->writeLog('Cache folder does not exist ('.$this->cache_dir.').');
			return false;		
		}
		
		// Controllo che la cache sia scrivibile
		if(!is_writable($this->cache_dir)){
			$this->cache = false;
			$this->writeLog('Cache folder ('.$this->cache_dir.') is not writable.');
			return false;
		}		

		// Pulisco la cache dai file vecchi
		$this->cleanCache();

		// Leggo il file dalla cache se è ancora presente
		$file = $this->cache_dir.'/'.$this->method.'_'.md5($this->paramsString);
		if(!is_file($file)){
			$this->writeLog('No file in cache named '.$file);
			return false;
		}

		// Leggo il file di cache e lo restituisco
		$h = fopen($file, "r");
		$this->response = fread($h, filesize($file));
		fclose($h);
		$this->writeLog('Reading from cache ('.$file.')');
			
		return true;
	}
	
	private function cleanCache(){
		$dir = $this->cache_dir;
		$maxtime = $this->cache_time;
		$i = 0;
		
		$dh = opendir($dir);
		while(false !== ($file = readdir($dh))){
			if(strpos($file, '.') === 0) continue;
			
			// Se sono passate tot ore dall'ultimo accesso al file, lo cancello
			if(time() - filemtime($dir.'/'.$file) > $maxtime){
				unlink($dir.'/'.$file);
				$i++;
			}
		}

		if($i)
			$this->writeLog('Cache cleaned ('.$i.' file/s)');
	}
}


class Flickr_API{

	function Flickr_API(){
	
	}

	function callMethod($params = array()){
		
		// Istanzio un oggetto dalla classe Flickr
		$f = new Flickr();
		
		switch($params['mode']){
			case 'photoset':
				unset($params['mode']);

				// Chiamata a Flickr
				$f->method = 'flickr.photosets.getPhotos';
				$f->params = $params;
				$f->call();
			
				$js = '{"log": ['.$f->getLogForJSON().'], '.substr($f->response, 1);
				break;
			case 'user':
				unset($params['mode']);

				if($user = $this->getUserInfo($params['user_id'])){
				
					$params['user_id'] = $user[0];
					$userInfo = $user[1];

					// Chiamata a Flickr
					$f->method = 'flickr.photos.search';
					$f->params = $params;
					$f->call();
					
					$js = '{"log": ['.$f->getLogForJSON().'], "userInfo": '.$userInfo.', '.substr($f->response, 1);
				}
				else{
					$js = '{"log": ["User \"'.$params['user_id'].'\" not found"], "error": "User not found"}';
				}
			
				break;

			case 'group':
				unset($params['mode']);

				if($group = $this->getGroupInfo($params['group_id'])){
					$params['group_id'] = $group[0];
					$groupInfo = $group[1];

					// Chiamata a Flickr
					$f->method = 'flickr.groups.pools.getPhotos';
					$f->params = $params;
					$f->call();
					
					$js = '{"log": ['.$f->getLogForJSON().'], "groupInfo": '.$groupInfo.', '.substr($f->response, 1);
				}
				else{
					$js = '{"log": ["User \"'.$params['group_id'].'\" not found"], "error": "Group not found"}';
				}
				
				break;

			default:
				$js = '{"log": ["No method selected"], "error": "Empty method"}';

				break;
		}
		
		return $js;
	}
	
	function getUserInfo($id){
		$id = trim($id);

		$f = new Flickr();
		if(stristr($id, '@')){ // --------------------------------------- Mi è stato passato un NSID
			// Recupero direttamente le info utente
			$f->method = 'flickr.people.getInfo';
			$f->params = array('user_id' => $id);
			$nsid = $id;
		}
		else{ // --------------------------------------------------- Mi è stato passato uno username
			// Recupero il NSID
			$f->method = 'flickr.people.findByUsername';
			$f->params = array('username' => $id);
			$f->call();
			
			$js = str_replace('"', '', $f->response);
			preg_match("/nsid\:([^,]+),/", $js, $matches);
			
			$nsid = $matches[1];
			if(!$nsid)
				return false;
			
			// Con il NSID recuperato, recupero le info utente
			$f->method = 'flickr.people.getInfo';
			$f->params = array('user_id' => $nsid);
		}
		$f->call();

		// Vedo se ci sono errori nella risposta
		$js = str_replace('"', '', $f->response);
		preg_match("/stat\:([^,]+),/", $js, $matches);

		if($matches[1] == 'fail')
			return false;

		return array($nsid, $f->response);
	}
	
	function getGroupInfo($id){
		$id = trim($id);

		$f = new Flickr();
		if(stristr($id, '@')){ // --------------------------------------- Mi è stato passato un NSID
			// Recupero direttamente le info del gruppo
			$f->method = 'flickr.groups.getInfo';
			$f->params = array('group_id' => $id);
			$nsid = $id;
		}
		else{ // --------------------------------------------------- Mi è stato passato uno username
			// Recupero il NSID
			$f->method = 'flickr.groups.search';
			$f->params = array('text' => $id, 'per_page' => 1);
			$f->call();

			$js = str_replace('"', '', $f->response);
			preg_match("/nsid\:([^,]+),/", $js, $matches);
			
			$nsid = $matches[1];
			if(!$nsid)
				return false;
			
			// Con il NSID recuperato, recupero le info utente
			$f->method = 'flickr.groups.getInfo';
			$f->params = array('group_id' => $nsid);
		}
		$f->call();

		// Vedo se ci sono errori nella risposta
		$js = str_replace('"', '', $f->response);
		preg_match("/stat\:([^,]+),/", $js, $matches);

		if($matches[1] == 'fail')
			return false;

		return array($nsid, $f->response);
	}
}

class GetImagesFromFolder extends Flickr_API{
	var $folder = ''; // user specified folder
	var $rootFolder = ''; // computed folder
	var $allowedTypes = array(
		'.jpg',
		'.jpeg',
		'.gif',
		'.png'
	);
	
	function GetImagesFromFolder($folder){
		$this->folder = $folder;
		
		// Aggiungo lo slash finale se non c'
		if(substr($folder, -1) != '/') $folder .= '/';
		
		// Sistemo il path se l'utente lo vuole assoluto
		if(substr($folder, 0, 1) == '/')
			$this->rootFolder = $_SERVER['DOCUMENT_ROOT'].$folder;
		else
			$this->rootFolder = $folder;
	}

	function getJSON(){
		// Chiedo il file js alla cache
		$js = $this->getFileFromCache($this->rootFolder, 'folder_');

		// Chiedo il file alla sorgente
		if(!$js)
			$js = $this->readFolder($this->rootFolder);

		// Messaggio di errore
		if(!$js)
			$js = '{"log": ['.implode(',', $this->logMsg).']}';
		else
			$js = '{"log": ['.implode(',', $this->logMsg).'], '.substr($js, 1);

		return $js;
	}

	function readFolder($folder){
		// Verifico che la cartella esista
		if(!is_dir($folder)){
			$this->logMsg[] = '"'.urlencode('Error: folder "'.$folder.'" does not exist.').'"';
			return false;
		}

		// Verifico che la cartella sia scrivibile
		if(!is_writable($folder)){
			$this->logMsg[] = '"'.urlencode('Error: folder "'.$folder.'" is not writable.<br />Please change it\'s permission to 777.').'"';
			return false;
		}

		// Creo la cartella che conterrà le thumb
		if(!is_dir($folder.'thumbs'))
			mkdir($folder.'thumbs');

		// Leggo i file dentro la cartella
		$js = '';
		$this->logMsg[] = '"'.urlencode('Reading from folder '.$folder).'"';
		if($handle = opendir($folder)){
			$f = str_replace(realpath($_SERVER['DOCUMENT_ROOT']), '', realpath($folder));
		
			$js = '{"photos":{';
			$js .= '"photo":[';
			while(false !==	($file = readdir($handle))){
				if(strpos($file, '.') === 0) continue;
				
				// Recupero l'estensione del file
				preg_match("/\.[^$]+$/", $file, $m);
				$ext = $m[0];

				// Verifico che sia prevista tra i tipi consentiti
				if(!in_array($ext, $this->allowedTypes)) continue;

				$exif = exif_read_data($folder.$file);

				$title = $exif['ImageDescription']?$exif['ImageDescription']:str_replace($ext, '', $file);
				$author = $exif['Artist']?$exif['Artist']:$exif['Copyright'];
				$thumb = $f.'/thumbs/t_'.$file;
				$thumb_dest = $folder.'thumbs/t_'.$file;

				$js .= '{';
				$js .= '"author":"'.$author.'",';
				$js .= '"url":"'.$f.'/'.$file.'",';
				$js .= '"thumb":"'.$thumb.'",';
				$js .= '"title":"'.$title.'"';
				$js .= '},';
				
				// Creo la relativa thumb
				$this->createThumb($folder.$file, $thumb_dest);
			}
			$js = substr($js, 0, -1); // Taglio l'ultima virgola
			$js .= ']}, "stat":"ok"}';

			closedir($handle);
			
			// Caching del file
			$this->writeCache($js);
		}
		else{
			$this->logMsg[] = '"'.urlencode('Error: folder "'.$folder.'" could not be open.').'"';
			return false;
		}
		
		return $js;
	}
	
	function createThumb($file, $dest){
		if(is_file($dest)) return;
		
		if(!function_exists('gd_info')){
			$this->logMsg[] = '"'.urlencode('Error: unable to create thumbnails. GD library is not installed.').'"';
			return;
		}
		
		$imageSize = getimagesize($file);
		$conten_type = $imageSize['mime'];

		switch($conten_type){
			case 'image/jpeg':
				$img = @imagecreatefromjpeg($file);
				break;
			case 'image/gif':
				$img = @imagecreatefromgif($file);
				break;
			case 'image/png':
				$img = @imagecreatefrompng($file);
				break;
		}

		$thumb_size = 75;
		$src_sizes = getimagesize($file);
		$src_width = $src_sizes[0];
		$src_height = $src_sizes[1];
		
		if($src_width > $src_height){
			$off_w = ($src_width - $src_height) / 2;
			$off_h = 0;
			$src_width = $src_height;
		}
		else if($src_height > $src_width){
			$off_w = 0;
			$off_h = ($src_height - $src_width) / 2;
			$src_height = $src_width;
		}
		else{
			$off_w = 0;
			$off_h = 0;
		}

		$temp = imagecreatetruecolor($thumb_size, $thumb_size);
		imagecopyresampled($temp, $img, 0, 0, $off_w, $off_h, $thumb_size, $thumb_size, $src_width, $src_height);

		// Salvo i thumb
		switch($conten_type){
			case 'image/jpeg':
				$img = imagejpeg($temp, $dest, 100);
				break;
			case 'image/gif':
				$img = imagegif($temp, $dest);
				break;
			case 'image/png':
				$img = imagepng($temp, $dest);
				break;
		}

		return;
	}
}

function checkImage($url){
	if(!function_exists('get_headers'))
		return 1;
		
	$headers = get_headers($url, 1);
	
	if(!strstr($headers[0], '200 OK'))
		return 0;
	else
		return 1;
}



/* -------------------------------------------- DEBUG ------------------------------------------- */
if(isset($_GET['debug'])){
	header("Content-type: text/plain; charset=UTF-8");

	$api = new Flickr_API();
	$js = $api->callMethod(
		array(
			'mode' => 'group',
//			'group_id' => '542521@N20',
			'group_id' => 'effetto gesugristu',
			'per_page' => '5',
			'page' => '',
			'tags' => '',
			'sort' => '',
			'tag_mode' => 'any' // any, all
		)
	);
	echo $js;
	
	exit;
}


/* ------------------------------------------ CHIAMATE ------------------------------------------ */
if($_GET['code'] == 1){
	$mode = isset($_GET['mode'])?$_GET['mode']:'photoset';
	$id = isset($_GET['id'])?$_GET['id']:'';
	$limit = isset($_GET['limit']) && is_numeric($_GET['limit'])?$_GET['limit']:30;
	$tags = isset($_GET['tags'])?$_GET['tags']:'';
	$maxSize = isset($_GET['maxSize'])?$_GET['maxSize']:'';
	$forceHeight = isset($_GET['forceHeight'])?'true':'false';
	$linkToFlickr = isset($_GET['linkToFlickr'])?'true':'false';
	$showOwner = isset($_GET['showOwner'])?'true':'false';
	$showTitle = isset($_GET['showTitle'])?'true':'false';
	$showButtons = isset($_GET['showButtons'])?'true':'false';
	$showThumbnails = isset($_GET['showThumbnails'])?'true':'false';
	$showMosaic = isset($_GET['showMosaic'])?'true':'false';
	$showMosaicImmediately = isset($_GET['showMosaicImmediately'])?'true':'false';
	$activateKeyboard = isset($_GET['activateKeyboard'])?'true':'false';
	$singleMode = isset($_GET['singleMode'])?'true':'false';
	$sort = isset($_GET['sort'])?$_GET['sort']:'date-posted-desc';
	$playImmediately = isset($_GET['playImmediately'])?'true':'false';
	$centeringMargin = isset($_GET['centeringMargin'])?'true':'false';
	$showLog = isset($_GET['showLog'])?'true':'false';
	$quickView = isset($_GET['quickView'])?'true':'false';
	$bigMosaic = isset($_GET['bigMosaic'])?'true':'false';
	$showFooter = isset($_GET['showFooter'])?'true':'false';
	
	$html = <<<EOD
<h3>Copy &amp; paste this code into your website</h3>
<input type="button" class="button" value="" onclick="Panel.close();" />
<textarea rows="29" cols="70"><!-- Kishlery code starts here -->
&lt;script type="text/javascript" src="http://www.kishnel.com/kishlery/js/global.js"></script>
<div id="kishlery" class="KLmainContainer"></div>
&lt;script type="text/javascript">
	var myKishlery = new Kishlery('kishlery', {
		mode: '{$mode}',
		id: '{$id}',
		limit: '{$limit}',
		tags: '{$tags}',
		maxSize: '{$maxSize}',
		forceHeight: {$forceHeight},
		linkToFlickr: {$linkToFlickr},
		showOwner: {$showOwner},
		showTitle: {$showTitle},
		showButtons: {$showButtons},
		showThumbnails: {$showThumbnails},
		showMosaic: {$showMosaic},
		activateKeyboard: {$activateKeyboard},
		singleMode: {$singleMode},
		sort: '{$sort}',
		showMosaicImmediately: {$showMosaicImmediately},
		playImmediately: {$playImmediately},
		centeringMargin: {$centeringMargin},
		showLog: {$showLog},
		quickView: {$quickView},
		bigMosaic: {$bigMosaic},
		showFooter: {$showFooter}
	});
</script>
<!-- Kishlery code ends here --></textarea>
EOD;

	header("Content-type: text/plain; charset=UTF-8");
	echo $html;

	exit;
}

switch($_GET['mode']){
	case 'photoset':
		$api = new Flickr_API();
		$js = $api->callMethod(
			array(
				'mode' => 'photoset',
				'photoset_id' => ''.$_GET['id'].'',
				'per_page' => ''.$_GET['per_page'].'',
				'page' => ''
			)
		);
		break;
	case 'user':
		$api = new Flickr_API();
		$js = $api->callMethod(
			array(
				'mode' => 'user',
				'user_id' => ''.$_GET['id'].'',
				'per_page' => ''.$_GET['per_page'].'',
				'page' => 1,
				'sort' => ''.$_GET['sort'].'', // date-posted-asc, date-posted-desc, date-taken-asc, date-taken-desc, interestingness-desc, interestingness-asc, relevance
				'tags' => ''.$_GET['tags'].'',
				'tag_mode' => 'any' // any, all
			)
		);
		break;
	case 'group':
		$api = new Flickr_API();
		$js = $api->callMethod(
			array(
				'mode' => 'group',
				'group_id' => ''.$_GET['id'].'',
				'per_page' => ''.$_GET['per_page'].'',
				'page' => '',
				'tags' => ''.$_GET['tags'].'',
				'tag_mode' => 'any' // any, all
			)
		);
		break;
	case 'folder':
		$api = new GetImagesFromFolder($_GET['id']);
		$js = $api->getJSON();
		break;
	case 'checkImage':
		$js = checkImage($_GET['url']);		
		
		break;
}

header("Content-type: text/plain; charset=UTF-8");
echo $_GET['callback'].'('.$js.')';
?>