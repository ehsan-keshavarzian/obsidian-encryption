import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface ObsidianEncryptionSettings {
	Password: string;
}

const DEFAULT_SETTINGS: ObsidianEncryptionSettings = {
	Password: ''
}

export default class ObsidianEncryption extends Plugin {
	settings: ObsidianEncryptionSettings;

	async onload() {
		console.log('loading Obsidian Encryption');

		await this.loadSettings();

		this.addRibbonIcon('lock', 'Encrypt', () => {
			
		});

    this.addRibbonIcon('lock-open', 'Decrypt', () => {
			
		});

		this.addCommand({
			id: 'encrypt',
			name: 'Encrypt',
			callback: () => {
			 	
			}
		});

    this.addCommand({
			id: 'decrypt',
			name: 'Decrypt',
			callback: () => {
			 	
			}
		});

		this.addSettingTab(new EncryptionSettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading Obsidian Encryption');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class EncryptionSettingTab extends PluginSettingTab {
	plugin: ObsidianEncryption;

	constructor(app: App, plugin: ObsidianEncryption) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Obsidian Encryption'});

		new Setting(containerEl)
			.setName('Password')
			.setDesc('Master Password')
			.addText(text => text
				.setPlaceholder('Enter password')
				.setValue('')
				.onChange(async (value) => {
					this.plugin.settings.Password = value;
					await this.plugin.saveSettings();
				}));
	}
}
