<main class="home">

<? if($logged_out): ?>

	<div class="login-div">
		<h1>Ferrum</h1>
		<form action="/" method="post">
			<div>
				<input type="text" name="username" value="<?= htmlentities($typed_username);?>" placeholder="Username"/>
				<input type="text" name="email" value="<?= htmlentities($typed_email);?>" placeholder="Email"/>
			</div>
			<div>
				<input type="password" name="password" value="" placeholder="Password"/>
				<input type="password" name="password_repeat" value="" placeholder="Password again"/>
			</div>
			<div>
				<input type="submit" name="submit_register" value="Register"/>
			</div>
		</form>
	</div>
	<a class="login-link" href="/">
		<p>Login instead</p>
	</a>

<? elseif($logged_in):

redirect_to("/");

endif;
