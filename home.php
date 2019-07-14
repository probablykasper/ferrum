<main class="home">

<? if($logged_out): ?>

	<div class="login-div">
		<h1>Ferrum</h1>
		<form action="" method="post">
			<div>
				<input type="text" name="username" value="<?= htmlentities($typed_username);?>"/>
				<input type="password" name="password" value=""/>
			</div>
			<div>
				<input type="submit" name="submit_login" value="Login"/>
			</div>
		</form>
	</div>
	<a class="register-link" href="/register">
		<p>Register instead</p>
	</a>

<? elseif($logged_in): ?>

	<p>Welcome back, <?=$username;?>!</p>
	<form action="" method="post">
		<input type="submit" name="submit_logout" value="Logout"/>
	</form>
	<div class="chat-box">
		<div class="chat-message">
			<p>Here it is</p>
		</div>
		<div class="chat-message">
			<p>Here it is again</p>
		</div>
		<div class="chat-message">
			<p>Here it is and again</p>
		</div>
		<div class="chat-message">
			<p>Here it is aaand here</p>
		</div>
		<div class="chat-message">
			<p>Here it is plus here</p>
		</div>
		<div class="chat-message">
			<p>Here it is so yeah</p>
		</div>
		<div class="chat-typer">
			<input type="text">
		</div>
	</div>

</main>

<? endif; ?>
