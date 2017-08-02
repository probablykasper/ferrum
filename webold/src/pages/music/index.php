<?= get_head("Ferrum"); ?>
    <div class="context-menu table-header">
        <div class="context-item">Name</div>
        <div class="context-item">Time</div>
        <div class="context-spacer"></div>
        <div class="context-item">Artist</div>
        <div class="context-item">Date added</div>
        <div class="context-item">Plays</div>
    </div>
    <!-- <div class="context-menu table-item">

    </div> -->
    <header class="app-bar">
        <div class="app-bar-button sidebar-toggle ferrum-highlight"></div>
        <input class="search-bar ferrum-highlight" placeholder="Search"></input>
        <div class="app-bar-button account-icon ferrum-highlight"></div>
    </header>
    <main class="songs-page home-page">
        <div class="music-table">
            <? $count = 30 ?>
            <div style="" class="col name flexible-width">
                <div class="cell name">
                    <span>Name</span>
                    <div class="col-resizer"><div class="line"></div></div>
                    <div class="sort-icon"></div>
                </div>
                <div class="cell name">Honesty</div>
                <div class="cell name">Lion's Den</div>
                <div class="cell name">Broken Pieces (feat. Nihils)</div>
                <div class="cell name">Want You</div>
                <div class="cell name">Marshmello</div>
            </div>
            <div style="" class="col time fixed-width">
                <div class="cell time">
                    <span>Time</span>
                    <div class="col-resizer"><div class="line"></div></div>
                    <div class="sort-icon"></div>
                </div>
                <div class="cell time">4:03</div>
                <div class="cell time">5:54</div>
                <div class="cell time">3:24</div>
                <div class="cell time">3:23</div>
                <div class="cell time">3:00</div>
            </div>
            <div style="" class="col artist flexible-width">
                <div class="cell artist">
                    <span>Artist</span>
                    <div class="col-resizer"><div class="line"></div></div>
                    <div class="sort-icon"></div>
                </div>
                <div class="cell artist">Camo &amp; Krooked</div>
                <div class="cell artist">Teminite &amp; PsoGnar</div>
                <div class="cell artist">Camo &amp; Krooked</div>
                <div class="cell artist">Orbiter</div>
                <div class="cell artist">Moving On</div>
            </div>
            <div style="" class="col album flexible-width">
                <div class="cell album">
                    <span>Album</span>
                    <div class="col-resizer"><div class="line"></div></div>
                    <div class="sort-icon"></div>
                </div>
                <div class="cell album">Mosaik</div>
                <div class="cell album"></div>
                <div class="cell album">Mosaik</div>
                <div class="cell album">We Do</div>
                <div class="cell album"></div>
            </div>
            <div style="" class="col date-added fixed-width">
                <div class="cell date-added">
                    <span>Date Added</span>
                    <div class="col-resizer"><div class="line"></div></div>
                    <div class="sort-icon"></div>
                </div>
                <div class="cell date-added">6/26/17</div>
                <div class="cell date-added">6/28/17</div>
                <div class="cell date-added">6/26/17</div>
                <div class="cell date-added">4/24/17</div>
                <div class="cell date-added">5/5/17</div>
            </div>
            <div style="" class="col plays fixed-width">
                <div class="cell plays">
                    <span>Plays</span>
                    <div class="col-resizer"><div class="line"></div></div>
                    <div class="sort-icon"></div>
                </div>
                <div class="cell plays">14</div>
                <div class="cell plays">5</div>
                <div class="cell plays">7</div>
                <div class="cell plays">10</div>
                <div class="cell plays">9</div>
            </div>
        </div>
    </main>
    <aside class="sidebar">
        <div class="sidebar-container">
            <div class="item home">Home?</div>
            <div class="item library">Library</div>
            <div class="item discover">Discovery</div>
            <div class="item podcasts">Podcasts</div>
            <div class="spacer"></div>
            <div class="item playlist">Favs</div>
            <div class="item playlist">Relax</div>
            <div class="item playlist">Last added</div>
            <div class="item playlist">Random</div>
            <div class="item playlist">New playlistttttttttt</div>
            <div class="spacer"></div>
            <div class="item import">Import</div>
            <div class="item settings">Settings</div>
            <div class="item settings">Trash</div>
            <div class="sidebar-resizer"></div>
        </div>
    </aside>
<?=get_js("jquery")?>
