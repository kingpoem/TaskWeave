export namespace config {
	
	export class Settings {
	    uvPath: string;
	    defaultWorkDir: string;
	    logRetentionDays: number;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.uvPath = source["uvPath"];
	        this.defaultWorkDir = source["defaultWorkDir"];
	        this.logRetentionDays = source["logRetentionDays"];
	    }
	}

}

export namespace task {
	
	export class RunRecord {
	    id: string;
	    taskId: string;
	    trigger: string;
	    status: string;
	    // Go type: time
	    startedAt: any;
	    // Go type: time
	    finishedAt: any;
	    durationMs: number;
	    exitCode: number;
	    logPath: string;
	    errorSummary?: string;
	
	    static createFrom(source: any = {}) {
	        return new RunRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.taskId = source["taskId"];
	        this.trigger = source["trigger"];
	        this.status = source["status"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.finishedAt = this.convertValues(source["finishedAt"], null);
	        this.durationMs = source["durationMs"];
	        this.exitCode = source["exitCode"];
	        this.logPath = source["logPath"];
	        this.errorSummary = source["errorSummary"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Task {
	    id: string;
	    name: string;
	    type: string;
	    path: string;
	    entry?: string;
	    command?: string[];
	    cron: string;
	    enabled: boolean;
	    env?: Record<string, string>;
	    workingDir?: string;
	    concurrencyPolicy: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Task(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.path = source["path"];
	        this.entry = source["entry"];
	        this.command = source["command"];
	        this.cron = source["cron"];
	        this.enabled = source["enabled"];
	        this.env = source["env"];
	        this.workingDir = source["workingDir"];
	        this.concurrencyPolicy = source["concurrencyPolicy"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

