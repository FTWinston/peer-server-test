import jsonpatch from 'jsonpatch';
import { PatchOperation } from 'filter-mirror';

export function applyPatch<T>(object: T, patch: PatchOperation[]) {
    return jsonpatch.apply_patch(object, patch) as T;
}
