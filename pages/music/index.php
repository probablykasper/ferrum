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
        <main class="songs-page home-page">
            <div class="music-table">
                <? $count = 30 ?>
                <div class="col name flexible-width">
                    <div class="cell name">
                        Name
                        <div class="col-resizer"><div class="line"></div></div>
                    </div>
                    <? for ($i = 0; $i < $count; $i++) { ?>
                        <div class="cell name">Close To You (Remix by someone)</div>
                    <? } ?>
                </div>
                <div class="col time fixed-width">
                    <div class="cell time">
                        Time
                        <div class="col-resizer"><div class="line"></div></div>
                    </div>
                    <? for ($i = 0; $i < $count; $i++) { ?>
                        <div class="cell time"><?=rand(0,12).":".rand(10,59)?></div>
                    <? } ?>
                </div>
                <div class="col artist flexible-width">
                    <div class="cell artist">
                        Artist
                        <div class="col-resizer"><div class="line"></div></div>
                    </div>
                    <? for ($i = 0; $i < $count; $i++) { ?>
                        <div class="cell artist">
                            Somebody Famous idk
                        </div>
                    <? } ?>
                </div>
                <div class="col album flexible-width">
                    <div class="cell album">
                        Album
                        <div class="col-resizer"><div class="line"></div></div>
                    </div>
                    <? for ($i = 0; $i < $count; $i++) { ?>
                        <div class="cell album">Somebody Famous idk</div>
                    <? } ?>
                </div>
                <div class="col date-added fixed-width">
                    <div class="cell date-added">
                        Date Added
                        <div class="col-resizer"><div class="line"></div></div>
                    </div>
                    <? for ($i = 0; $i < $count; $i++) { ?>
                        <div class="cell album"><?=rand(0,12)."/".rand(0,31)."/".rand(10,99)?></div>
                    <? } ?>
                </div>
                <div class="col plays fixed-width">
                    <div class="cell plays">
                        Plays
                        <div class="col-resizer"><div class="line"></div></div>
                    </div>
                    <? for ($i = 0; $i < $count; $i++) { ?>
                        <div class="cell plays"><?=rand(0,999)?></div>
                    <? } ?>
                </div>
            </div>
        </main>
        <aside class="sidebar">
            <div class="item home">Home?</div>
            <div class="item library">Library</div>
            <div class="item discover">Discovery</div>
            <div class="item podcasts">Podcasts</div>
            <div class="spacer"></div>
            <div class="item playlist">Favs</div>
            <div class="item playlist">Relax</div>
            <div class="item playlist">Last added</div>
            <div class="item playlist">Random</div>
            <div class="item playlist">New playlist</div>
            <div class="spacer"></div>
            <div class="item import">Import</div>
            <div class="item settings">Settings</div>
            <div class="item settings">Trash</div>
            <div class="sidebar-resizer"></div>
        </aside>
		<!--jQuery--> <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
		<!--js.cookie--> <script src="/js/js.cookie-2.1.4.min.js"></script>
		<!--rangeSlider--> <script src="/js/rangeSlider-0.3.11.min.js"></script>
        <script src="/js/music/index.js?r=<?=rand(0,999)?>"></script>
	</body>
</html>
