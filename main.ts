import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, MarkdownView, Editor } from 'obsidian';

interface ObsidianEncryptionSettings {
	Password: string;
}

const DEFAULT_SETTINGS: ObsidianEncryptionSettings = {
	Password: ''
}

export default class ObsidianEncryption extends Plugin {
	settings: ObsidianEncryptionSettings;
	
	async replace(text: string, regex: RegExp, replacer: any) : Promise<string> {
		const substrs = [];
		let match;
		let i = 0;
		while (true) {
			match = regex.exec(text);
			if (match  !== null) {
				substrs.push(text.slice(i, match.index));
				substrs.push(replacer(...match));
				i = regex.lastIndex;
			} else {
				break;
			}
		}
		substrs.push(text.slice(i));
		return (await Promise.all(substrs)).join('');
	}
	
	async encryptData(data: string) : Promise<string> {
		const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(this.settings.Password));
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const algorithm = { name: 'AES-GCM', iv: iv };
		const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM', iv: iv }, false, ['encrypt']);
		const buffer = await crypto.subtle.encrypt(algorithm, key, new TextEncoder().encode(data));
		const cipherText = btoa(Array.from(new Uint8Array(buffer)).map(byte => String.fromCharCode(byte)).join(''));
		const ivHex = Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');
		return ivHex + cipherText;
	}
	
	async decryptData(ciphertext: string) : Promise<string> {
		const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(this.settings.Password));
		const iv = ciphertext.slice(0,24).match(/.{2}/g).map(byte => parseInt(byte, 16));
		const algorithm = { name: 'AES-GCM', iv: new Uint8Array(iv) };
		const key = await crypto.subtle.importKey('raw', hash, algorithm, false, ['decrypt']);
		const buffer = await crypto.subtle.decrypt(algorithm, key, new Uint8Array(atob(ciphertext.slice(24)).match(/[\s\S]/g).map(ch => ch.charCodeAt(0))));
		return new TextDecoder().decode(buffer);
	}
	
	getEditor(): Editor {
		const mdview = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!mdview) {
			return null;
		}
		const editor = mdview.Editor;
		if (!editor) {
			return null;
		}
		return editor;
	}
	
	async processText(text: string, process: (match: string) => Promise<string>, state: string): Promise<string> {
		return await this.replace(text, /(<secret state="(plain|encrypted)">|<secret>)(?<secret>.+?)(<\/secret>)/g, async (match:string, p1:any, p2:any, p3:any, p4:any, offset:any, input_string:any) => {
			if (state === p2) {
				return match;
			}
			return "<secret state=\"" + state + "\">" + await process(p3) + "</secret>";
		});
	}
	
	processDocument(process: (match: string) => string, state: string): void {
		const editor = this.getEditor();
		const text = editor.getValue();
		this.processText(text, process, state)
		.then(processedText => {
			editor.setValue(processedText);
		};
	}
	
	encrypt(): void {
		this.processDocument(this.encryptData, "encrypted");
	}
	
	decrypt(): void {
		this.processDocument(this.decryptData, "plain");
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
	}
}
