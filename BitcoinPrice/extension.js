// Copyright (C) 2013 Aran Dunkley
// Licence: GPLv2+
const Mainloop = imports.mainloop;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Lang = imports.lang;
const Convenience = Local.imports.convenience;
const Settings = Local.imports.settings;
const Soup = imports.gi.Soup;

let extpath;
function init(metadata) {
	extpath = metadata.path;
}

let BitcoinPriceMenuButton = new Lang.Class({
	Name: 'BitcoinPriceMenuButton',
	Extends: PanelMenu.Button,

	_init: function(extpath) {
		this._settings = Convenience.getSettings();
		this.parent(0.25);

		// Text & icon
		this.paneltext = new St.Label({ text: '...' });
		let icon = new St.Icon({ style_class: 'bitcoinprice-icon' });
		icon.set_gicon(new Gio.FileIcon({ file: Gio.file_new_for_path(GLib.build_filenamev([extpath, 'Bitcoin-icon.png']))}));
		this.panelicon = new St.Bin({ style_class: 'panel-button', reactive: true, can_focus: true, x_fill: true, y_fill: false, track_hover: true });
		this.panelicon.set_child(icon);

		// Add text & icon to a topbox
		let topBox = new St.BoxLayout();
		topBox.add_actor(this.panelicon);
		topBox.add_actor(this.paneltext);
		this.actor.add_actor(topBox);

		// Add the menu
		let item = new PopupMenu.PopupSeparatorMenuItem();
		this.menu.addMenuItem(item);
		Main.panel._menus.addMenu(this.menu);
		Main.panel._rightBox.insert_child_at_index(this.actor, 0);

		// Call the regular update and settings check
		this.update_price();
		this.check_settings();
	},

	stop: function() {
		if(this._timeoutSrc) Mainloop.source_remove(this._timeoutSrc);
		if(this._checkSettingsSrc) Mainloop.source_remove(this._checkSettingsSrc);
	},

	update_price: function() {

		// Get the currency setting and make the url
		let settings = Settings.getSettings(this._settings);
		let currencies = ["USD","AUD","CHF","NOK","RUB","DKK","JPY","CAD","NZD","PLN","CNY","SEK","SGD","HKD","EUR"];
		let currency = currencies[settings.currency];
		let url = 'http://mtgox.com/api/1/BTC' + currency + '/ticker';
		let text = this.paneltext;

		// Request the MtGox data
		let session = new Soup.SessionAsync();
		let message = Soup.Message.new('GET', url);
		session.queue_message(message, function(session, message) {
			let json = JSON.parse(message.response_body.data);
			if(json.result == 'success') text.set_text(json['return']['last']['display']);
		});

		// Call regularly
		let period = 120; //settings_data.refresh_period;
		this._timeoutSrc = Mainloop.timeout_add_seconds(period, this.update_price);
	},

	check_settings: function() {
		let settings = Settings.getSettings(this._settings);
		if(settings.reload_now == true) {
			settings.reload_now = false;
			this._settings.set_string("settings-json", JSON.stringify(settings));
			this.paneltext.set_text('...');
			if(this._timeoutSrc) Mainloop.source_remove(this._timeoutSrc);
			this.update_price();
		}
		this._checkSettingsSrc = Mainloop.timeout_add_seconds(2, this.check_settings);
	}
});

let bitcoinpriceMenu;
function enable() {
    bitcoinpriceMenu = new BitcoinPriceMenuButton(extpath);
    Main.panel.addToStatusArea('bitcoinpriceMenu', bitcoinpriceMenu);
}

function disable() {
	bitcoinpriceMenu.stop();
	bitcoinpriceMenu.destroy();
}
