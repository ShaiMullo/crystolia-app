import { Controller, Get, Post, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Post()
    create(@Request() req, @Body() createInvoiceDto: CreateInvoiceDto) {
        // Only admin/secretary can manually create invoices
        if (req.user.role !== 'admin' && req.user.role !== 'secretary') {
            throw new ForbiddenException('Only admins can create invoices');
        }
        return this.invoicesService.create(createInvoiceDto);
    }

    @Get()
    findAll(@Request() req) {
        return this.invoicesService.findAll(req.user.role, req.user._id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.invoicesService.findOne(id);
    }
}
