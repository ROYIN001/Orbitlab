import { expect, it } from 'vitest';
import { nosePointingTarget } from '../src/physics/rigid/guidance-attitude';
import { quatConjugate, quatFromAxisAngle, quatMultiply, quatRotate } from '../src/physics/rigid/math';
import { norm, normalize, sub, v3 } from '../src/physics/vec3';

it('points through the roll-reference pole without demanding a roll twist', () => {
  const attitude = quatFromAxisAngle(v3(1, 2, 3), 0.7);
  for (const bodyNose of [v3(1, 0, 0), v3(-1, 0, 0), v3(0, 0, 1), v3(0, 1e-10, 1), v3(-0.8, 0.5, 0.1)]) {
    const nose = quatRotate(attitude, normalize(bodyNose));
    const target = nosePointingTarget(attitude, nose);
    expect(norm(sub(quatRotate(target, v3(1, 0, 0)), nose))).toBeLessThan(1e-10);
    const error = quatMultiply(quatConjugate(attitude), target);
    expect(Math.abs(error.x)).toBeLessThan(1e-12);
  }
});
