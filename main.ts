import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, MarkdownView } from 'obsidian';
import crypto from 'crypto';

const _PREFIX: string = '<secret>';
const _SUFFIX: string = '</secret>';

interface ObsidianEncryptionSettings {
	Password: string;
	Algorithm: string;
}

const DEFAULT_SETTINGS: ObsidianEncryptionSettings = {
	Password: '',
	Algorithm: 'aes-256-cbc'
}

export default class ObsidianEncryption extends Plugin {
	settings: ObsidianEncryptionSettings;
	encoding: string = 'hex';
	iv_length: int = 16;

	getEditor(): Editor {
		const mdview = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!mdview) {
			return null;
		}
		const editor = mdview.sourceMode.cmEditor;
		if (!editor) {
			return null;
		}
		return editor;
	}
	
	encrypt(): void {
		const iv = crypto.randomBytes(this.iv_length);
		const cipher = crypto.createCipheriv(this.settings.Algorithm, new Buffer(this.settings.Password), iv);
		const encryptedData = Buffer.concat([cipher.update(data,), cipher.final(), iv]).toString(this.encoding);
	}
	
	decrypt(): void {
		const binaryData = new Buffer(data, this.encoding);
		const iv = binaryData.slice(-this.iv_length);
		const encryptedData = binaryData.slice(0, binaryData.length - this.iv_length);
		const decipher = crypto.createDecipheriv(this.settings.Algorithm, new Buffer(this.settings.Password), iv);
		const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString();
	}
	
	async onload() {
		console.log('loading Obsidian Encryption');

		await this.loadSettings();

		this.addRibbonIcon('lock', 'Encrypt', () => {
			this.encrypt();
		});

   		this.addRibbonIcon('lock-open', 'Decrypt', () => {
			this.decrypt();
		});

		this.addCommand({
			id: 'encrypt',
			name: 'Encrypt',
			callback: () => {
			 	this.encrypt();
			}
		});

    		this.addCommand({
			id: 'decrypt',
			name: 'Decrypt',
			callback: () => {
			 	this.decrypt();
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
		new Setting(containerEl)
			.setName('Algorithm')
			.setDesc('Encryption Algorithm')
			.addText(text => text
				.setValue('aes-256-cbc')
				.onChange(async (value) => {
					this.plugin.settings.Password = value;
					await this.plugin.saveSettings();
				}));
	}
}
