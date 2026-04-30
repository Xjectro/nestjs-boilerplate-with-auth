import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Turtle, TurtleDocument } from './entities/turtle.schema';

export type TurtleWritableFields = Pick<Turtle, 'name' | 'species' | 'age' | 'slug'>;

@Injectable()
export class TurtleRepository {
  constructor(
    @InjectModel(Turtle.name)
    private readonly turtleModel: Model<TurtleDocument>,
  ) {}

  create(payload: TurtleWritableFields) {
    return this.turtleModel.create(payload);
  }

  findAll() {
    return this.turtleModel.find().exec();
  }

  async findPaginated(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, totalItems] = await Promise.all([
      this.turtleModel.find().skip(skip).limit(limit).exec(),
      this.turtleModel.countDocuments(),
    ]);
    return { items, totalItems };
  }

  findById(id: string) {
    return this.turtleModel.findOne({ id }).exec();
  }

  findBySlug(slug: string) {
    return this.turtleModel.findOne({ slug }).exec();
  }

  updateById(id: string, payload: Partial<TurtleWritableFields>) {
    return this.turtleModel.findOneAndUpdate({ id }, payload, { new: true }).exec();
  }

  removeById(id: string) {
    return this.turtleModel.findOneAndDelete({ id }).exec();
  }

  softDeleteById(id: string) {
    return this.turtleModel
      .findOneAndUpdate({ id }, { deletedAt: new Date() }, { new: true })
      .exec();
  }

  restoreById(id: string) {
    return this.turtleModel
      .findOneAndUpdate({ id, includeDeleted: true }, { deletedAt: null }, { new: true })
      .exec();
  }
}
