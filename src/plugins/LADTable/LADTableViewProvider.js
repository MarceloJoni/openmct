/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2020, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/
import LadTable from './components/LADTable.vue';
import Vue from 'vue';

export default function LADTableViewProvider(openmct) {
    return {
        key: 'LadTable',
        name: 'LAD Table',
        cssClass: 'icon-tabular-lad',
        canView: function (domainObject) {
            return domainObject.type === 'LadTable';
        },
        canEdit: function (domainObject) {
            return domainObject.type === 'LadTable';
        },
        view: function (domainObject, objectPath) {
            let component;

            return {
                show: function (element) {
                    component = new Vue({
                        el: element,
                        components: {
                            LadTableComponent: LadTable
                        },
                        provide: {
                            openmct
                        },
                        data: () => {
                            return {
                                domainObject,
                                objectPath
                            };
                        },
                        template: '<lad-table-component :domain-object="domainObject" :object-path="objectPath"></lad-table-component>'
                    });
                },
                destroy: function (element) {
                    component.$destroy();
                    component = undefined;
                }
            };
        },
        priority: function () {
            return 1;
        }
    };
}
