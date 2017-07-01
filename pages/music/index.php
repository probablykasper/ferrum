<!DOCTYPE html>
<html>
	<head>
		<title>Ferrum</title>
		<!--Roboto--> <link href="https://fonts.googleapis.com/css?family=Roboto:400,500" rel="stylesheet">
		<link rel="stylesheet" type="text/css" href="/css/global.css?r=<?=rand(0,999)?>">
		<link rel="stylesheet" type="text/css" href="/css/music/index.css?r=<?=rand(0,999)?>">
	</head>

	<body>
        <header class="app-bar">
            <div class="app-bar-button sidebar-toggle ferrum-highlight"></div>
            <input class="search-bar ferrum-highlight" placeholder="Search"></input>
            <div class="app-bar-button account-icon ferrum-highlight"></div>
        </header>
        <main class="home-page">
            <table class="songs">
                <tbody>
                    <tr class="head">
                        <td class="name flexible-width">
                            <div>Name</div>
                            <div class="md width-perc"></div>
                            <div class="col-resizer"><div class="line"></div></div>
                        </td>
                        <td class="time fixed-width">
                            <div>Time</div>
                            <div class="md width-perc"></div>
                            <div class="col-resizer"><div class="line"></div></div>
                        </td>
                        <td class="artist flexible-width">
                            <div>Artist</div>
                            <div class="md width-perc"></div>
                            <div class="col-resizer"><div class="line"></div></div>
                        </td>
                        <td class="album flexible-width">
                            <div>Album</div>
                            <div class="md width-perc"></div>
                            <div class="col-resizer"><div class="line"></div></div>
                        </td>
                        <td class="date-added fixed-width">
                            <div>Date Added</div>
                            <div class="md width-perc"></div>
                            <div class="col-resizer"><div class="line"></div></div>
                        </td>
                        <td class="plays fixed-width">
                            <div>Plays</div>
                            <div class="md width-perc"></div>
                            <div class="col-resizer"><div class="line"></div></div>
                        </td>
                    </tr>
                    <? for ($i = 0; $i < 30; $i++) { ?>
                    <tr>
                        <td class="name no-overflow">
                            <div>Close To You (Remix by someone)</div>
                        </th>
                        <td class="time">
                            <div><?=rand(0,12).":".rand(10,59)?></div>
                        </th>
                        <td class="artist no-overflow">
                            <div>Somebody Famous idk</div>
                        </th>
                        <td class="album no-overflow">
                            <div>Lorem Ipsum EP</div>
                        </th>
                        <td class="date-added">
                            <div><?=rand(0,12)."/".rand(0,31)."/".rand(10,99)?></div>
                        </th>
                        <td class="plays">
                            <div><?=rand(0,999)?></div>
                        </th>
                    </tr>
                    <? } ?>
                </tbody>
            </table>
        </main>
		<!--jQuery--> <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
		<!--js.cookie--> <script src="/js/js.cookie-2.1.4.min.js"></script>
		<!--rangeSlider--> <script src="/js/rangeSlider-0.3.11.min.js"></script>
        <script src="/js/music/index.js?r=<?=rand(0,999)?>"></script>
	</body>
</html>
