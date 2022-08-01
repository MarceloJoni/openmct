import { isAnnotationType, isNotebookType, isNotebookOrAnnotationType } from './notebook-constants';

export default function (openmct) {
    const apiSave = openmct.objects.save.bind(openmct.objects);

    openmct.objects.save = async (domainObject) => {
        if (!isNotebookOrAnnotationType(domainObject)) {
            return apiSave(domainObject);
        }

        const isNewMutable = !domainObject.isMutable;
        const localMutable = openmct.objects._toMutable(domainObject);
        let result;

        try {
            result = await apiSave(localMutable);
        } catch (error) {
            if (error instanceof openmct.objects.errors.Conflict) {
                result = await resolveConflicts(domainObject, localMutable, openmct);
            } else {
                throw new Error(error);
            }
        } finally {
            if (isNewMutable) {
                openmct.objects.destroyMutable(localMutable);
            }
        }

        return result;
    };
}

function resolveConflicts(domainObject, localMutable, openmct) {
    if (isNotebookType(domainObject)) {
        return resolveNotebookEntryConflicts(localMutable, openmct);
    } else if (isAnnotationType(domainObject)) {
        return resolveNotebookTagConflicts(localMutable, openmct);
    }
}

async function resolveNotebookTagConflicts(localAnnotation, openmct) {
    const localClonedAnnotation = structuredClone(localAnnotation);
    const remoteMutable = await openmct.objects.getMutable(localClonedAnnotation.identifier);

    // should only be one annotation per targetID & entryID, so for sanity, ensure we have the
    // same targetID & entryID for this conflict
    Object.keys(localClonedAnnotation.targets).forEach(localTargetKey => {
        if (!remoteMutable.targets[localTargetKey]) {
            throw new Error(`Conflict on annotation target is missing ${localTargetKey}`);
        }

        if (remoteMutable.targets[localTargetKey].entryId !== localClonedAnnotation.targets[localTargetKey].entryId) {
            throw new Error(`Conflict on annotation entryID ${remoteMutable.targets[localTargetKey].entryId} has a different entry Id ${localClonedAnnotation.targets[localClonedAnnotation].entryId}`);
        }
    });

    const uniqueMergedTags = [...new Set([...remoteMutable.tags, ...localClonedAnnotation.tags])];
    if (uniqueMergedTags.length !== remoteMutable.tags.length) {
        openmct.objects.mutate(remoteMutable, 'tags', uniqueMergedTags);
    }

    openmct.objects.destroyMutable(remoteMutable);

    return true;
}

async function resolveNotebookEntryConflicts(localMutable, openmct) {
    if (localMutable.configuration.entries) {
        const localEntries = structuredClone(localMutable.configuration.entries);
        const remoteMutable = await openmct.objects.getMutable(localMutable.identifier);
        applyLocalEntries(remoteMutable, localEntries, openmct);
        openmct.objects.destroyMutable(remoteMutable);
    }

    return true;
}

function applyLocalEntries(mutable, entries, openmct) {
    Object.entries(entries).forEach(([sectionKey, pagesInSection]) => {
        Object.entries(pagesInSection).forEach(([pageKey, localEntries]) => {
            const remoteEntries = mutable.configuration.entries[sectionKey][pageKey];
            const mergedEntries = [].concat(remoteEntries);
            let shouldMutate = false;

            const locallyAddedEntries = _.differenceBy(localEntries, remoteEntries, 'id');
            const locallyModifiedEntries = _.differenceWith(localEntries, remoteEntries, (localEntry, remoteEntry) => {
                return localEntry.id === remoteEntry.id && localEntry.text === remoteEntry.text;
            });

            locallyAddedEntries.forEach((localEntry) => {
                mergedEntries.push(localEntry);
                shouldMutate = true;
            });

            locallyModifiedEntries.forEach((locallyModifiedEntry) => {
                let mergedEntry = mergedEntries.find(entry => entry.id === locallyModifiedEntry.id);
                if (mergedEntry !== undefined
                    && locallyModifiedEntry.text.match(/\S/)) {
                    mergedEntry.text = locallyModifiedEntry.text;
                    shouldMutate = true;
                }
            });

            if (shouldMutate) {
                openmct.objects.mutate(mutable, `configuration.entries.${sectionKey}.${pageKey}`, mergedEntries);
            }
        });
    });
}
