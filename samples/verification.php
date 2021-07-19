<?php
/**
 * Menjalankan Kode:
 * - php -S 127.0.0.1:8080 verification.php
 * 
 */
include 'config.php';
if (@$_POST['notelp']) {
  function generateRandomString($length = 10)
  {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
      $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
  }
  // echo(round(microtime(true) * 1000));

  $token = generateRandomString(20);
  if (!is_dir('.tokens')) mkdir('.tokens');
  file_get_contents(botenpoint.'/verify/create?token='.$token.'&redirecto=http://127.0.0.1:8080');
  file_put_contents('.tokens/' . $token, json_encode(['notelp' => $_POST['notelp']]));
} elseif (@$_GET['token'] && $_GET['client']) {
  if(is_file('.tokens/'.$_GET['token'])) {
    $content = json_decode(file_get_contents('.tokens/'.$_GET['token']));
    switch(strtolower($_GET['client'])) {
      case 'wa':
        $content->wa = true;
        break;
      case 'tg':
        $content->tg = true;
        break;
      default:
        break;
    }
    file_put_contents('.tokens/'.$_GET['token'], json_encode($content));
    http_response_code(200);
    die;
  }
  http_response_code(400);
  die;
}
if ($handle = opendir('.tokens')) {
  echo "<ul>";
  while (false !== ($entry = readdir($handle))) {
    if ($entry != "." && $entry != "..") {
      $tx = json_decode(file_get_contents('.tokens/'.$entry));
      $notelp = $tx->notelp;
      $wa = @$tx->wa ? 'style="text-decoration: line-through;"':'';
      $tg = @$tx->tg ? 'style="text-decoration: line-through;"':'';
      echo "<li> ".$notelp." | <a target=\"_blank\" href=\"https://wa.me/".wabotid."?text=".$entry."\" ".$wa.">WhatsApp</a> - <a target=\"_blank\" href=\"https://t.me/".tgbotid."?send=halohalo\" ".$tg.">Telegram</a></li>";
    }
  }
  echo "</ul>";
  closedir($handle);
}

?>
<form action="" method="post">
  <input type="text" name="notelp" placeholder="Masukan Nomor Telpon">
</form>