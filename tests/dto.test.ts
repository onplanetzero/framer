import { Pet } from '../examples/petstore/generated/types'
import { PetDto } from '../examples/petstore/generated/dto'
import { createPetFactory } from '../examples/petstore/generated/dto-mocker';

test('dto is mappable', () => {
    const fakePet: Pet = createPetFactory(),
        pet: PetDto = new PetDto();

    console.log(fakePet);

    pet.map(fakePet);

    expect(pet.id).toEqual(fakePet.id);
    expect(pet.name).toEqual(fakePet.name);
    expect(pet.photoUrls).toEqual(fakePet.photoUrls);
    expect(pet.status).toEqual(fakePet.status);
    expect(pet.category.id).toEqual(fakePet.category.id);
    expect(pet.category.name).toEqual(fakePet.category.name);
    expect(pet.tags).toEqual(fakePet.tags);
});

test('dto works with data passed into constructor', () => {
    const fakePet: Pet = createPetFactory(),
        pet: PetDto = new PetDto(fakePet);

    expect(pet.id).toEqual(fakePet.id);
    expect(pet.name).toEqual(fakePet.name);
    expect(pet.photoUrls).toEqual(fakePet.photoUrls);
    expect(pet.status).toEqual(fakePet.status);
    expect(pet.category.id).toEqual(fakePet.category.id);
    expect(pet.category.name).toEqual(fakePet.category.name);
    expect(pet.tags).toEqual(fakePet.tags);
});
