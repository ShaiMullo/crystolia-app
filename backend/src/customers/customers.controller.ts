import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    // Inject userId from logged in user
    createCustomerDto.userId = req.user._id;
    return this.customersService.create(createCustomerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    // TODO: Filter by role (Admin only see all)
    // For now, allow logged in users to see all (or restrict later)
    return this.customersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-profile')
  async getMyProfile(@Request() req) {
    const customer = await this.customersService.findByUserId(req.user._id);
    if (!customer) {
      // It's valid to not have a profile yet
      return { message: 'No customer profile found' };
    }
    return customer;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
