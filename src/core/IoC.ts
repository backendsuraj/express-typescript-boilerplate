/**
 * IOC - CONTAINER
 * ----------------------------------------
 *
 * Bind every controller and service to the ioc container. All controllers
 * will then be bonded to the express structure with their defined routes.
 */

import * as fs from 'fs';
import { interfaces } from 'inversify-express-utils';
import { Container } from 'inversify';
import { Types } from '../constants/Types';
import { Core, Controller, Model, Service, Repository } from '../constants/Targets';

import { events, EventEmitter } from './api/events';
import { Log } from './log';


import { User } from '../api/models/User';


class IoC {

    public container: Container;
    public customConfiguration: (container: Container) => Container;

    constructor() {
        this.container = new Container();
    }

    public get Container(): Container {
        return this.container;
    }

    public configure(configuration: (container: Container) => Container): void {
        this.customConfiguration = configuration;
    }

    public async bindModules(): Promise<void> {
        this.bindCore();
        await this.bindModels();
        // this.bindControllers();

        this.container = this.customConfiguration(this.container);
    }

    private bindCore(): void {
        this.container.bind<typeof Log>(Types.Core).toConstantValue(Log).whenTargetNamed(Core.Log);
        this.container.bind<EventEmitter>(Types.Core).toConstantValue(events).whenTargetNamed(Core.Events);
    }

    private async bindControllers(): Promise<void> {
        this.getFiles('/controllers', (files: string[]) => {
            files.forEach((file: any) => {
                console.log(file);
                const fileExport = require(`${file.path}/${file.fileName}`);
                console.log(fileExport);
                this.container
                    .bind<interfaces.Controller>(Types.Controller)
                    .to(fileExport[file.name])
                    .whenTargetNamed(Controller[file.name]);
            });
        });
    }

    private bindModels(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            console.log('Models');
            this.getFiles('/models', (files: string[]) => {
                files.forEach((file: any) => {
                    const fileExport = require(`${file.path}/${file.fileName}`);
                    this.validateExport(fileExport[file.name]);
                    this.validateTarget(Model, file.name);

                    this.container
                        .bind<any>(Types.Model)
                        .toConstantValue(fileExport[file.name])
                        .whenTargetNamed(Model[file.name]);

                    resolve();
                });
            });
        });
    }

    private getBasePath(): string {
        const baseFolder = __dirname.indexOf('/src/') >= 0 ? '/src/' : '/dist/';
        const baseRoot = __dirname.substring(0, __dirname.indexOf(baseFolder));
        return `${baseRoot}${baseFolder}api`;
    }

    private getFiles(path: string, done: (files: any[]) => void): void {
        fs.readdir(this.getBasePath() + path, (err: any, files: string[]): void => {
            if (err) {
                console.error(err);
            }
            done(files.map((fileName: string) => ({
                path: this.getBasePath() + path,
                fileName: fileName,
                name: this.parseName(fileName)
            })));
        });
    }

    private parseName(fileName: string): string {
        return fileName.substring(0, fileName.length - 3);
    }

    private validateExport(value: any): void {
        if (!value) {
            throw new Error(`${value} is not defined in the target constants`);
        }
    }

    private validateTarget(target: any, value: any): void {
        if (target && target[value] === undefined) {
            throw new Error(`${value} is not defined in the target constants`);
        }
    }

}

export const ioc = new IoC();
