<?
	session_start();
	include("./includes/functions.php");
	get_slug();
	redirect_if();
	db_connect();

	include("./includes/check_login.php");

	if ($slug == "/") {
		$include_path = "home.php";
	} elseif ($slug == "/register") {
		$include_path = "register.php";
	} else {
		// redirect_to("");
	}
?>

<!DOCTYPE html>
<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" type="text/css">
		<link rel="stylesheet" type="text/css" href="/css/global.css">
	</head>
	<body>
		<? include("$include_path"); ?>
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>
		<script src="/js/global.js"></script>
	</body>
</html>
<? db_disconnect(); ?>
