import { NotFoundException } from '@nestjs/common';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate as isUUID } from "uuid";

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');
  
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  )    {}

  async create(createProductDto: CreateProductDto) {

    try {

      const product = await this.productRepository.create(createProductDto);
      await this.productRepository.save(product);
      return product;

    } catch (error) {
      this.handleExceptions(error)
    }
  }


  //TODO: Paginar
  async findAll(paginationDto:PaginationDto) {

    const {limit=10, offset=0} = paginationDto;
    const product = await this.productRepository.find({
      take: limit,
      skip: offset
      //TODO: Relaciones
    })
    // console.log(product);
    return product;
  }

  async findOne(term: string) {

    let product : Product;

    if ( isUUID(term)) {
      
        product = await this.productRepository.findOneBy({id:term})
    }
    else{
      // product = await this.productRepository.findOneBy({slug:term})
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder.where(`lower(title) =:title or lower(slug) =:slug`,{
        title:term.toLowerCase(),
        slug:term.toLowerCase()
      } ).getOne();
    }

    if (product === null) {
      this.handleNotFound(term)
    }
    else{

      return product;
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto
    });

    if (!product)this.handleNotFound(id);
    try {
      await this.productRepository.save(product);
      
    } catch (error) {
      this.handleExceptions(error)
    }
   
    return product; 

  }

  async remove(id: string) {
    const producto = await this.productRepository.delete(id)
    console.log(producto);
    if (producto.affected > 0) {

      return `${id} has removed`;
    }
    else{
      this.handleNotFound(id)
    }
  }

  private handleNotFound(id){
    throw new NotFoundException(`No se ha encontrado un registro con id ${id}`)
  }

  private handleExceptions(error:any){
    if (error.code === '23505') {
      throw new BadRequestException(error.detail)
    }
    this.logger.error(error);
    throw new InternalServerErrorException("Error inesperado, mira la consola para ver el log")
  }
}
