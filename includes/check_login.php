<?

$username = "";
$typed_username = "";
$typed_email = "";

if (isset($_POST["submit_logout"])) {
	$_SESSION["logged_in"] = false;
	$_SESSION["username"] = NULL;
}

if (isset($_POST["submit_login"])) {
	$username = $_POST["username"];
	$typed_username = $username;
	$username = mysqli_real_escape_string($db_connection, $username);

	$password = $_POST["password"];
	$query = db_query("SELECT * FROM logins WHERE username = '{$username}' LIMIT 1");

	if ($user = mysqli_fetch_assoc($query)) {
		if ($user["password"] == $password) {
			$_SESSION["logged_in"] = true;
			$username = $user["username"];
			$username = htmlentities($username);
			$_SESSION["username"] = $username;
		}
	} else {
		$_SESSION["logged_in"] = false;
	}
}

if (isset($_POST["submit_register"])) {
	$username = $_POST["username"];
	$typed_username = $username;
	$username = mysqli_real_escape_string($db_connection, $username);

	$email = $_POST["email"];
	$typed_email = $email;
	$email = mysqli_real_escape_string($db_connection, $email);

	$password = $_POST["password"];
	$password = mysqli_real_escape_string($db_connection, $password);
	$password_repeat = $_POST["password_repeat"];
	$password_repeat = mysqli_real_escape_string($db_connection, $password_repeat);

	$query = db_query("SELECT * FROM logins WHERE username = '{$username}' LIMIT 1");
	if ($user = mysqli_fetch_assoc($query)) {
		// username exists already
		echo "Username already taken";
	} else {
		// username is unique
		$query = db_query("INSERT INTO logins VALUES ('{$email}','{$username}','{$password}')");
	}
}

session_to_string("logged_in");
session_to_string("username");
session_to_string("email");

$logged_out = !$logged_in;

?>
