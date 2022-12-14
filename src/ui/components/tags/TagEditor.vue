/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2022, United States Government
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

<template>
<div class="c-tag-applier">
    <TagSelection
        v-for="(addedTag, index) in addedTags"
        :key="index"
        :selected-tag="addedTag.newTag ? null : addedTag"
        :new-tag="addedTag.newTag"
        :added-tags="addedTags"
        @tagRemoved="tagRemoved"
        @tagAdded="tagAdded"
    />
    <button
        v-show="!userAddingTag && !maxTagsAdded"
        class="c-tag-applier__add-btn c-icon-button c-icon-button--major icon-plus"
        title="Add new tag"
        @click="addTag"
    >
        <div class="c-icon-button__label">Add Tag</div>
    </button>
</div>
</template>

<script>
import TagSelection from './TagSelection.vue';

export default {
    components: {
        TagSelection
    },
    inject: ['openmct'],
    props: {
        annotations: {
            type: Array,
            required: true
        },
        annotationType: {
            type: String,
            required: true
        },
        targetSpecificDetails: {
            type: Object,
            required: true
        },
        domainObject: {
            type: Object,
            default() {
                return null;
            }
        }
    },
    data() {
        return {
            addedTags: [],
            userAddingTag: false
        };
    },
    computed: {
        availableTags() {
            return this.openmct.annotation.getAvailableTags();
        },
        maxTagsAdded() {
            const availableTags = this.openmct.annotation.getAvailableTags();

            return !(availableTags && availableTags.length && (this.addedTags.length < availableTags.length));
        }
    },
    watch: {
        annotations: {
            handler() {
                this.annotationsChanged();
            },
            deep: true
        }
    },
    mounted() {
        this.annotationsChanged();
    },
    methods: {
        annotationsChanged() {
            if (this.annotations && this.annotations.length) {
                this.tagsChanged();
            }
        },
        annotationDeletionListener(changedAnnotation) {
            const matchingAnnotation = this.annotations.find((possibleMatchingAnnotation) => {
                return this.openmct.objects.areIdsEqual(possibleMatchingAnnotation.identifier, changedAnnotation.identifier);
            });
            if (matchingAnnotation) {
                matchingAnnotation._deleted = changedAnnotation._deleted;
                this.userAddingTag = false;
                this.tagsChanged();
            }
        },
        tagsChanged() {
            // gather tags from annotations
            const tagsFromAnnotations = this.annotations.flatMap((annotation) => {
                if (annotation._deleted) {
                    return [];
                } else {
                    return annotation.tags;
                }
            }).filter((tag, index, array) => {
                return array.indexOf(tag) === index;
            });

            if (tagsFromAnnotations.length !== this.addedTags.length) {
                this.addedTags = this.addedTags.slice(0, tagsFromAnnotations.length);
            }

            for (let index = 0; index < tagsFromAnnotations.length; index += 1) {
                this.$set(this.addedTags, index, tagsFromAnnotations[index]);
            }
        },
        addTag() {
            const newTagValue = {
                newTag: true
            };
            this.addedTags.push(newTagValue);
            this.userAddingTag = true;
        },
        async tagRemoved(tagToRemove) {
            // Soft delete annotations that match tag instead
            const annotationsToDelete = this.annotations.filter((annotation) => {
                return annotation.tags.includes(tagToRemove);
            });
            if (annotationsToDelete) {
                await this.openmct.annotation.deleteAnnotations(annotationsToDelete);
                this.$emit('tags-updated', annotationsToDelete);
            }
        },
        async tagAdded(newTag) {
            // Either undelete an annotation, or create one (1) new annotation
            const existingAnnotation = this.annotations.find((annotation) => {
                return annotation.tags.includes(newTag);
            });

            const createdAnnotation = await this.openmct.annotation.addSingleAnnotationTag(existingAnnotation,
                this.domainObject, this.targetSpecificDetails, this.annotationType, newTag);

            this.userAddingTag = false;

            this.$emit('tags-updated', createdAnnotation);
        }
    }
};
</script>
