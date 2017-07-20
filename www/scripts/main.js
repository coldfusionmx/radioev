//var _server_url = "http://localhost/Radiologia/";
var _server_url = "http://api.desoftware.mx/eventos/index.php/obtener/";
//var _server_url = "http://www.movieclip.mx/apps/radiologia/";
var _data_path = _server_url; //+ "data/";
var _image_path = _server_url + "images/";
var _data_storage;
var _sync_index = 0;
var _sync_files = [];
var _sync = []
var _device_type;
var _screen_width;
var _screen_height;
var _nc = 0;

$(document).ready(function() {
  _data_storage = window.localStorage;

  _device_type = (navigator.userAgent.match(/iPad/i))  == "iPad" ? "iPad" : (navigator.userAgent.match(/iPhone/i))  == "iPhone" ? "iPhone" : (navigator.userAgent.match(/Android/i)) == "Android" ? "Android" : (navigator.userAgent.match(/BlackBerry/i)) == "BlackBerry" ? "BlackBerry" : "null";

  _screen_width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  _screen_height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

  $(".home-content").css("height",_screen_height - 257);
  $("#Home").children().hide();

  Sync();
  //isFileExistOnBundle("images/media/speaker-1.jpg");
  //alert("Conexion: " + navigator.network.connection.type);
});

function ShowLoading(text){
  $(".loading_text").html(text);
  $(".modal").show();
}

function HideLoading(){
  $(".modal").hide();
}

function onTapBack(){
  $.mobile.back();
}

function Sync(){
  ShowLoading("Sincronizando");

  _nc = Math.round(Math.random()*10000);

  //console.log("Descargando " + _data_path + "sync.json?nc=" + _nc + "...");

  $.get(_data_path + "sync.json?nc=" + _nc,null,function(data){
    _sync = data;
    if(_data_storage.getItem("sync") == null){
      _sync_files = data;
      _sync_index = _sync_files.length-1;
      getJsonFile();
    }else{
      _sync_files = [];
      var tmp_sync = $.parseJSON(_data_storage.getItem("sync"));
      $.each(data,function(index,value){
        var insert_queue = true;
        $.each(tmp_sync,function(index2,value2){
          if(value.file == value2.file){
            //console.log(value.published +"=="+ value2.published)
            if(value.published == value2.published){
              //console.log("Fechas iguales");
              insert_queue = false;
              return false;
            }else{
              //console.log("Fechas diferentes");
            }
          }

        });
        if(insert_queue){
          _sync_files.push(value);
        }
      });

      if(_sync_files.length > 0){
        _sync_index = _sync_files.length-1;
        getJsonFile();
      }else{
        InitUI();
      }
    }
  }).fail(function(){
    //console.log("No se pudo conectar al servidor");
    //alert("Por el momento no es posible verificar actualizaciones de contenido.");
    InitUI();
  });
}

function getJsonFile(){
  var file = _sync_files[_sync_index].file;
  //console.log("Descargando " + _data_path + file + "?nc=" + _nc + "...");

  $.get(_data_path + file + "?nc=" + _nc,null,function(data){
    var key = _sync_files[_sync_index].file.replace(".json","");
    _data_storage.setItem(key,JSON.stringify(data));
    _sync_index--;
    if(_sync_index >= 0){
      getJsonFile();
    }else{
      SaveSyncLog()
    }
  }).fail(function(){
    //console.log("No se pudo descargar el archivo: " + file);
    _sync_index--;
    if(_sync_index >= 0){
      getJsonFile();
    }else{
      SaveSyncLog()
    }
  });
}

function SaveSyncLog(){
  //console.log("Termino de descargar los archivos json");
  _data_storage.setItem("sync",JSON.stringify(_sync));

  InitUI();
}

function onTapClearLocalStorage(){
  window.localStorage.clear();
  //console.log("LocalStorage eliminado");
}

function isFileExistOnBundle(path){
  var reader = new FileReader();
  reader.onloadend = function(evt) {
    if(evt.target.result == null) {
      alert("No existe");
    } else {
      alert("Exste");
    }
  };
  reader.readAsDataURL(path);
}

function InitUI(){
  ShowLoading("Preparando");
  $(".title_container").attr('data-position', 'fixed');
  //$(".main_menu_opt").attr('data-transition','slide');

  if(_device_type == "iPad" || _device_type == "iPhone"){
    var back = "<a onclick=\"onTapBack()\" data-role=\"none\" class=\"back_btn\"><img class=\"back-btn-img\" src=\"images/app/back-btn.png\"></a>";
    $(back).insertBefore('.title_header');
    $(".title_container").addClass('topbar-ios');
  }

  InitInfo();
  InitSchedule();
  InitSpeakers();
  InitSponsors();
  InitServices();

  var home_height = $(".home-content").height() - $("#HomeSlider").height();
  var title_height = 128; //$("#HomeTitleMain").height();
  var margin_top = (home_height - title_height)/2;
  $("#HomeTitleMain").css("margin-top",margin_top);
  $("#Home").children().show();
  HideLoading();
}

// FUNCIONES DE LA PAGINA DE INFORMACION Y SEDE
function InitInfo(){
  var info = $.parseJSON(_data_storage.getItem("info"));

  $("#HomeTitleText").html(info.name);

  $("#HomeTitle").html(info.name);
  $("#HomeDate").html(info.date);
  $("#HomeContent").html(info.content);
  $("#ContactName").html(info.contact.name);
  $("#ContactPhone").attr("href","tel:" + info.contact.phone.replace(" ",""));
  $("#ContactMail").attr("href","mailto:" + info.contact.mail)

  $("#PlaceName").html(info.main_place.name);
  $("#PlaceAddress").html(info.main_place.address);
  $("#PlacePhone").attr("href","tel:" + info.main_place.phone)
}

$(document).on("pagebeforeshow","#Place",function(){ // When entering pagetwo
  var info = $.parseJSON(_data_storage.getItem("info"));
  InitMap(info.main_place.latitude, info.main_place.longitude);
});

function InitMap(latitude, longitude) {
    var latlng = new google.maps.LatLng(latitude, longitude);
    var map = new google.maps.Map(document.getElementById('map'), {
      center: latlng,
      scrollwheel: false,
      zoom: 16
    });

    var marker = new google.maps.Marker({
     map: map,
     position: latlng
    });
}

// FUNCIONES DE LA PAGINA DE LA AGENDA
function InitSchedule(){
  var schedule_arr = $.parseJSON(_data_storage.getItem("schedule"));
  var html = "";
  var html_tabs = "";

  //console.log("Inicializa Vista Speakers...");
  console.log(schedule_arr);
  $.each(schedule_arr,function(index,day){
      var date = getStrignFromDate(day.date);
      var tabname = "Tab" + index;
      var active = (index == 0) ? "ui-btn-active" : "";
      html += "<li class=\"tabbar_item_container\"><a class=\"tabbar_item " + active + "\" href=\"#" + tabname + "\" data-theme=\"a\" data-ajax=\"false\">" + date + "</a></li>";
      html_tabs += "<div id=\"" + tabname + "\">";
      html_tabs += "  <table class=\"schedule_table\" cellspacing=\"0\">";
      $.each(day.items,function(index2,item){
        html_tabs += getScheduleRowByType(item,index2,index);
      });
      html_tabs += "  </table>"
      html_tabs += "</div>";
  });
  $("#DateTabs").html(html);
  $("#ScheduleContent").html(html_tabs);
  $(".schedule_row").on('click',function(ev){
    var row_index = Number($(this).attr('row-index'));
    var table_index = Number($(this).attr('table-index'));

    getSpeakersInfoByItem(table_index,row_index);
  })
}

function getScheduleRowByType(item,row,table){
    var html = "";
    if(item.type == 1){
      html += "<tr class=\"colored_row\">";
      html += " <td class=\"schedule_time\">" + item.time + "</td>";
      html += " <td class=\"schedule_title\">"+item.title+"</td>";
      html += " <td class=\"schedule_button\"></td>";
      html += "</tr>";
      //html = "<li data-role=\"list-divider\">" + item.title + "</li>";
    }else if(item.type == 2){
      html += "<tr class=\"schedule_row\" row-index=\""+ row +"\" table-index=\""+table+"\">";
      html += " <td class=\"schedule_time\">" + item.time + "</td>";
      html += " <td class=\"schedule_title\">"+item.title + getSpeakersNames(item.speaker) + "</td>";
      html += " <td class=\"schedule_button\"><span class=\"icon-chevron-right\"></span></td>";
      html += "</tr>";
      //html = "<li><a href=\"#\">" + item.title + "</a></li>";
    }else if(item.type == 4){
      html += "<tr class=\"schedule_row\" row-index=\""+ row +"\" table-index=\""+table+"\">";
      html += " <td class=\"schedule_time\">" + item.time + "</td>";
      html += " <td class=\"schedule_title\"><b>"+item.title+"</b>" + getSpeakersNames(item.speaker) + "</td>";
      html += " <td class=\"schedule_button\"><span class=\"icon-chevron-right\"></span></td>";
      html += "</tr>";
      //html = "<li><a href=\"#\">" + item.title + "</a></li>";
    }else if(item.type == 3){
      html += "<tr>";
      html += " <td class=\"schedule_time\">" + item.time + "</td>";
      html += " <td class=\"schedule_title\">"+item.title + getSpeakersNames(item.speaker) + "</td>";
      html += " <td class=\"schedule_button\"></td>";
      html += "</tr>";
      //html = "<li><a href=\"#\">" + item.title + "</a></li>";
    }
    return html;
}

function getStrignFromDate(str){
  var months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  var components = str.split("/");
  return components[0] + " de " + months[Number(components[1])-1];
}

function getSpeakersInfoByItem(table,row){
  var schedule_arr = $.parseJSON(_data_storage.getItem("schedule"));
  var item_speakers_arr = schedule_arr[table].items[row].speaker.split(",");
  goSpeakerDetail(item_speakers_arr);
}

function getSpeakersNames(speakers){
  var speakers_arr = $.parseJSON(_data_storage.getItem("speakers"));
  var item_speakers_arr = speakers.split(",");
  var html = "<ul>";
  $.each(item_speakers_arr,function(index,value){
    var speaker = getSpeakerById(value);
    html += "<li class=\"schedule-row-speaker-name\">" + speaker.name + "</li>";
  });
  html += "</ul>";
  return html;
}

function getSpeakerById(id){
  if(isNaN(id)){
    return {"name":id};
  }else{
    var speakers_arr = $.parseJSON(_data_storage.getItem("speakers"));
    var speaker_data = {};
    $.each(speakers_arr,function(index,speaker){
      if(id == speaker.id){
        speaker_data = speaker;
        return false;
      }
    });
    return speaker_data;
  }
}

// FUNCIONES DE LA PAGINA DE SPEAKERS LISTADO
function InitSpeakers(){
  var speakers_arr = $.parseJSON(_data_storage.getItem("speakers"));
  var html = "";
  $.each(speakers_arr,function(index,speaker){
    html += "<li>";
    html += "<a href=\"javascript:onTapSpeaker(" + speaker.id + ")\">";
    html += "<img class=\"speaker_thumb\" src=\"images/media/speaker-"+speaker.id+".jpg\" onerror=\"onSpeakerImgError(this)\" />";
    html += "<h2>" + speaker.name + "</h2>";
    html += "</a>";
    html += "</li>";
  });
  $("#SpeakersList").html(html);
}

function onSpeakerImgError(ev){
  ev.src='images/app/speaker-no-photo.jpg';
}

function onTapSpeaker(id){
  goSpeakerDetail([id]);
}

function goSpeakerDetail(ids){
    var html = "";
    $("#SpeakerDetailMain").empty();

    $.each(ids,function(index,id_speaker){
      var speaker = getSpeakerById(id_speaker);
      html += "<div class=\"speaker_detail\">"
      html += " <div class=\"speaker_detail_thumb_container\">";
      html += "   <img class=\"speaker_photo\" src=\"images/media/speaker-"+speaker.id+".jpg\" onerror=\"onSpeakerImgError(this)\" />";
      html += " </div>";
      html += " <h2>" + speaker.name + "</h2>";
      if(speaker.extract != ""){
        html += " <p>" + speaker.extract + "<p>";
      }
      if(speaker.bio != ""){
        html += " <h3>Biograf&iacute;a</h3>";
        html += speaker.bio;
      }
      if(speaker.mail != ""){
        html += " <a data-role=\"button\" href=\"mailto:" + speaker.mail + "\">Enviar correo</a>";
      }
      html += "</div>";
    });

    $("#SpeakerDetailMain").html(html);
    //$.mobile.changePage( "#SpeakerDetail", { transition: "slideup", changeHash: false });

    $.mobile.navigate( "#SpeakerDetail?id=" + new Date().getMilliseconds(), { transition: "slide", changeHash: false } );
}

// FUNCIONES DE SPONSORS
function InitSponsors(){
  var sponsors_arr = $.parseJSON(_data_storage.getItem("sponsors"));
  var html = "";
  var html_slider = "";

  $.each(sponsors_arr,function(index,data){
    var url = "images/media/sponsor-" + data.id + ".jpg";
    html += "<div onclick=\"onTapSponsor(" + index + ")\" class=\"sponsor-container\">";
    html += " <img class=\"fluid-img\" src=\"" + url + "\">";
    html += "</div>";

    html_slider += "<li class=\"wrap\">";
		html_slider += "	<img class=\"fluid-img\" src=\"" + url + "\" onerror=\"onSponsorImgError(this)\">";
		html_slider += "</li>";
  });

  $("#SponsorsList").html(html);
  $("#scroller").html(html_slider);

  $(function() {
		$("#scroller").simplyScroll({direction:'forwards',pauseOnHover:false});
	});
}

function onSponsorImgError(ev){
  ev.src='images/app/sponsor-no-photo.jpg';
}

function onTapSponsor(index){
  var sponsors_arr = $.parseJSON(_data_storage.getItem("sponsors"));
  var website = sponsors_arr[index].website;
  alert(website);
}

// FUNCIONES DE SERVICIOS
function InitServices(){
  var services_arr = $.parseJSON(_data_storage.getItem("services"));
  var html = "";
  $.each(services_arr,function(index,data){
    html += "<div class=\"service-header\">";
    html += data.header;
    html += "</div>";

    $.each(data.items,function(index2,item){
      html += "<div class=\"item-table\">";
      html += " <div class=\"item-row\">";
      html += "   <div class=\"item-cell item-content\">" + item.name + "</div>";
      if(data.type == 1){
        html += "   <div class=\"item-cell item-icon\"><span class=\"icon-info-with-circle\"></span></div>";
      }else{
        html += "   <div class=\"item-cell item-icon\"><span class=\"icon-phone\"></span></div>";
      }

      html += " </div>";
      html += "</div>";
    });
  });

  $("#ServicesList").html(html);
}
