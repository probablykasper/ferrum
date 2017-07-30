<? // slug
    $slug = strtolower($_SERVER["REQUEST_URI"]);
    $slug = explode("?", $slug, 2)[0];
    if ($slug != "/") $slug = rtrim($slug, "/");

    $a404 = false;
    if ($slug == "/") {
        $include_path = "/index";
    } elseif (file_exists("pages$slug/index.php")) {
        $include_path = "$slug/index";
    } elseif (file_exists("pages$slug.php")) {
        $include_path = "$slug";
    } else {
        $a404 = true;
        $include_path = "/404";
    }
?>
<?
    function get_head($title = "", $css = "") {
        $r = "?r=".rand(0,999);
        global $slug, $include_path;
        return "<head>"
        ."\n        <title>$title</title>"
        ."\n        <link href=\"https://fonts.googleapis.com/css?family=Roboto:400,500\" rel=\"stylesheet\">"
        ."\n        <link rel=\"stylesheet\" type=\"text/css\" href=\"/css/global.css$r>\">"
        ."\n        <link rel=\"stylesheet\" type=\"text/css\" href=\"/css$include_path.css$r?>\">"
        ."\n    </head>"
        ."\n<body>\n";
    }
    function get_js($a = "", $b = "", $c = "") {
        $html = "";
        $arr = [$a, $b, $c];
        foreach($arr as $scripts => $val) {
            if ($val == "") break;
            if ($val == "jquery") $html .= '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>';
            elseif ($val == "jscookie") $html .= '<script src="/js/js.cookie-2.1.4.min.js"></script>';
            elseif ($val == "rangeslider") $html .= '<script src="/js/rangeSlider-0.3.11.min.js"></script>';
        }
        return $html."\n</body>\n";
    }
?>

<!DOCTYPE html>
<html>
    <? require("pages".$include_path.".php"); ?>
</html>
